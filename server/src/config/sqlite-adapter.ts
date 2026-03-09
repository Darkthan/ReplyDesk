import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

/**
 * SQLite adapter qui simule l'interface de pg.Pool
 * pour permettre de basculer facilement entre SQLite (dev) et PostgreSQL (prod)
 */

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'emailauto.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    logger.info(`SQLite database opened at ${dbPath}`);
  }
  return db;
}

interface QueryResult {
  rows: any[];
  rowCount: number;
  command?: string;
}

/**
 * Client SQLite qui simule pg.PoolClient
 */
class SqliteClient {
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
  }

  /**
   * Exécute une requête SQL et retourne un résultat compatible avec pg
   */
  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    try {
      // Convertir les booléens JS en entiers 0/1 (SQLite ne supporte pas les booléens)
      const normalizedParams = params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
      params = normalizedParams;

      // Remplacer les placeholders PostgreSQL ($1, $2) par SQLite (?, ?)
      let sqliteSql = sql;
      if (params.length > 0) {
        sqliteSql = sql.replace(/\$(\d+)/g, (match, num) => {
          return '?';
        });
      }

      // Remplacer les types/fonctions PostgreSQL par SQLite
      sqliteSql = sqliteSql
        .replace(/NOW\(\)/gi, "datetime('now')")
        .replace(/TIMESTAMPTZ/gi, 'TEXT')
        .replace(/BOOLEAN/gi, 'INTEGER')
        .replace(/\btrue\b/gi, '1')
        .replace(/\bfalse\b/gi, '0');

      // Gérer les clauses RETURNING (non supportées par SQLite)
      // Le flag `s` (dotAll) permet à `.+` de matcher les sauts de ligne
      const returningMatch = sqliteSql.match(/RETURNING\s+(.+)$/is);
      if (returningMatch) {
        const returningColumns = returningMatch[1].trim();
        sqliteSql = sqliteSql.replace(/RETURNING\s+.+$/is, '').trim();

        // Exécuter l'INSERT/UPDATE
        const command = sql.trim().split(' ')[0].toUpperCase();

        if (command === 'INSERT') {
          // Générer un UUID pour l'ID si nécessaire
          const needsId = sqliteSql.toLowerCase().includes('insert into') && !params.find(p => typeof p === 'string' && p.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
          const newId = generateUUID();

          // Extraire le nom de la table
          const tableMatch = sqliteSql.match(/INSERT\s+INTO\s+(\w+)/i);
          const tableName = tableMatch ? tableMatch[1] : '';

          // Ajouter l'ID aux colonnes si nécessaire
          let modifiedSql = sqliteSql;
          let modifiedParams = [...params];

          if (needsId && tableName) {
            // Insérer l'ID dans la requête
            modifiedSql = sqliteSql.replace(/\(([^)]+)\)/, `(id, $1)`);
            modifiedSql = modifiedSql.replace(/VALUES\s*\(([^)]+)\)/, `VALUES (?, $1)`);
            modifiedParams = [newId, ...params];
          }

          const stmt = this.db.prepare(modifiedSql);
          const info = stmt.run(...modifiedParams);

          // Récupérer la ligne insérée
          const selectColumns = returningColumns === '*' ? '*' : returningColumns;
          const providedId = params.find(p => typeof p === 'string' && p.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
          const rowId = needsId ? newId : (providedId ?? info.lastInsertRowid);
          const selectStmt = this.db.prepare(`SELECT ${selectColumns} FROM ${tableName} WHERE id = ?`);
          const rows = selectStmt.all(rowId);

          return {
            rows,
            rowCount: info.changes,
            command: 'INSERT',
          };
        } else if (command === 'UPDATE') {
          const stmt = this.db.prepare(sqliteSql);
          const info = stmt.run(...params);

          // Pour UPDATE, on ne peut pas facilement récupérer les lignes sans WHERE clause
          // On retourne juste le nombre de lignes modifiées
          return {
            rows: [],
            rowCount: info.changes,
            command: 'UPDATE',
          };
        }
      }

      // Déterminer le type de requête
      const command = sql.trim().split(' ')[0].toUpperCase();

      if (command === 'SELECT' || sql.trim().toUpperCase().startsWith('SELECT')) {
        const stmt = this.db.prepare(sqliteSql);
        const rows = stmt.all(...params);

        // Convertir les booléens SQLite (0/1) en vrais booléens
        const convertedRows = rows.map(row => {
          const converted: any = {};
          for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
            // Convertir 0/1 en boolean pour les champs booléens connus
            if (['is_active'].includes(key)) {
              converted[key] = value === 1;
            } else {
              converted[key] = value;
            }
          }
          return converted;
        });

        return {
          rows: convertedRows,
          rowCount: convertedRows.length,
          command: 'SELECT',
        };
      } else if (command === 'INSERT' || command === 'UPDATE' || command === 'DELETE') {
        const stmt = this.db.prepare(sqliteSql);
        const info = stmt.run(...params);
        return {
          rows: [],
          rowCount: info.changes,
          command,
        };
      } else {
        // Pour CREATE TABLE, ALTER, etc.
        this.db.exec(sqliteSql);
        return {
          rows: [],
          rowCount: 0,
          command,
        };
      }
    } catch (error: any) {
      logger.error('SQLite query error:', { sql, params, error: error.message });
      throw error;
    }
  }

  /**
   * Simule le release du client (no-op pour SQLite)
   */
  release(): void {
    // No-op pour SQLite car on n'utilise pas de pool
  }
}

/**
 * Pool SQLite qui simule pg.Pool
 */
export class SqlitePool {
  private db: Database.Database;

  constructor() {
    this.db = getDb();
  }

  /**
   * Obtient un client (simule pool.connect())
   */
  async connect(): Promise<SqliteClient> {
    return new SqliteClient(this.db);
  }

  /**
   * Exécute une requête directement (simule pool.query())
   */
  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    const client = await this.connect();
    try {
      return await client.query(sql, params);
    } finally {
      client.release();
    }
  }

  /**
   * Simule pool.on() pour la compatibilité
   */
  on(event: string, callback: (err: Error) => void): void {
    // No-op pour SQLite
  }

  /**
   * Ferme la base de données
   */
  async end(): Promise<void> {
    if (db) {
      db.close();
      db = null;
      logger.info('SQLite database closed');
    }
  }
}

/**
 * Helper pour générer des UUIDs compatibles SQLite
 */
export function generateUUID(): string {
  return randomUUID();
}
