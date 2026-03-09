import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { config } from './index';
import { logger } from '../utils/logger';
import { SqlitePool, generateUUID } from './sqlite-adapter';

// Déterminer si on utilise SQLite (dev) ou PostgreSQL (prod)
const useSqlite = process.env.NODE_ENV === 'development' || process.env.USE_SQLITE === 'true';

// Type unifié pour le pool
type DatabasePool = Pool | SqlitePool;

// Créer le pool approprié
export const pool: DatabasePool = useSqlite
  ? new SqlitePool()
  : new Pool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

if (!useSqlite) {
  (pool as Pool).on('error', (err) => {
    logger.error('Unexpected database pool error', err);
  });
}

logger.info(`Using ${useSqlite ? 'SQLite' : 'PostgreSQL'} database`);

export async function testConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    logger.info('Database connection successful');
  } finally {
    client.release();
  }
}

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    if (useSqlite) {
      // Migration 001 + 002 — tables de base (seulement si elles n'existent pas)
      const { rows } = await client.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='mail_servers'"
      );

      if (rows.length === 0) {
        logger.info('Running SQLite migrations 001 & 002...');

        const migration1Path = path.join(__dirname, '..', 'db', 'migrations', '001_create_tables.sqlite.sql');
        const migration1Sql = fs.readFileSync(migration1Path, 'utf-8');
        const statements1 = migration1Sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
        for (const statement of statements1) {
          await client.query(statement);
        }
        logger.info('Migration 001 executed successfully');

        const migration2Path = path.join(__dirname, '..', 'db', 'migrations', '002_create_admin_table.sqlite.sql');
        if (fs.existsSync(migration2Path)) {
          const migration2Sql = fs.readFileSync(migration2Path, 'utf-8');
          const statements2 = migration2Sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
          for (const statement of statements2) {
            const uuidForAdmin = generateUUID();
            const modifiedStatement = statement.replace(
              /lower\(hex\(randomblob\(4\)\).*?\)/,
              `'${uuidForAdmin}'`
            );
            await client.query(modifiedStatement);
          }
          logger.info('Migration 002 executed successfully');
        }
      }

      // Migration 003 — credentials SMTP (idempotente)
      const { rows: smtpCols } = await client.query(
        "SELECT name FROM pragma_table_info('mail_servers') WHERE name='smtp_user'"
      );
      if (smtpCols.length === 0) {
        const migration3Path = path.join(__dirname, '..', 'db', 'migrations', '003_add_smtp_credentials.sqlite.sql');
        if (fs.existsSync(migration3Path)) {
          const migration3Sql = fs.readFileSync(migration3Path, 'utf-8');
          const statements3 = migration3Sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
          for (const statement of statements3) {
            await client.query(statement);
          }
          logger.info('Migration 003 executed successfully');
        }
      }

      // Migration 004 — champ reason sur closure_periods (idempotente)
      const { rows: reasonCols } = await client.query(
        "SELECT name FROM pragma_table_info('closure_periods') WHERE name='reason'"
      );
      if (reasonCols.length === 0) {
        await client.query("ALTER TABLE closure_periods ADD COLUMN reason TEXT");
        logger.info('Migration 004 executed successfully');
      }

      // Migration 005 — created_by nullable sur closure_periods (idempotente)
      const { rows: createdByInfo } = await client.query(
        "SELECT \"notnull\" FROM pragma_table_info('closure_periods') WHERE name='created_by'"
      );
      if (createdByInfo.length > 0 && createdByInfo[0].notnull === 1) {
        logger.info('Running migration 005: fixing created_by nullable...');
        await client.query('PRAGMA foreign_keys = OFF');
        await client.query("CREATE TABLE closure_periods_new (id TEXT PRIMARY KEY, name TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, default_subject TEXT NOT NULL DEFAULT 'Absence automatique', default_message TEXT NOT NULL DEFAULT 'Bonjour, je suis actuellement absent. Je reviendrai vers vous dès que possible.', reason TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_by TEXT REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), CONSTRAINT check_dates CHECK (end_date > start_date))");
        await client.query('INSERT INTO closure_periods_new SELECT id, name, start_date, end_date, default_subject, default_message, reason, is_active, created_by, created_at, updated_at FROM closure_periods');
        await client.query('DROP TABLE closure_periods');
        await client.query('ALTER TABLE closure_periods_new RENAME TO closure_periods');
        await client.query('CREATE INDEX idx_closure_periods_dates ON closure_periods(start_date, end_date)');
        await client.query('PRAGMA foreign_keys = ON');
        logger.info('Migration 005 executed successfully');
      }

      // Migration 006 — réparer les enregistrements users avec id NULL (bug UUID injection)
      const { rows: nullUsers } = await client.query("SELECT rowid FROM users WHERE id IS NULL OR id = ''");
      for (const row of nullUsers) {
        const newId = generateUUID();
        await client.query('UPDATE users SET id = $1 WHERE rowid = $2', [newId, row.rowid]);
      }
      if (nullUsers.length > 0) {
        logger.info(`Migration 006: fixed ${nullUsers.length} user(s) with null id`);
      }

      // Créer l'admin par défaut si aucun admin n'existe
      const { rows: existingAdmins } = await client.query("SELECT id FROM admins LIMIT 1");
      if (existingAdmins.length === 0) {
        const passwordHash = await bcrypt.hash(config.adminPassword, 10);
        const adminId = generateUUID();
        await client.query(
          "INSERT INTO admins (id, username, password_hash, email) VALUES ($1, 'admin', $2, $3)",
          [adminId, passwordHash, config.adminEmail || 'admin@emailauto.local']
        );
        logger.info('Default admin created from ADMIN_PASSWORD env variable');
      }

      // Migration 007 — tables de sécurité (idempotente)
      const { rows: securityTables } = await client.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='security_settings'"
      );
      if (securityTables.length === 0) {
        await client.query(`CREATE TABLE security_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
        await client.query(`CREATE TABLE ip_rules (id TEXT PRIMARY KEY, ip TEXT NOT NULL UNIQUE, type TEXT NOT NULL CHECK(type IN ('whitelist','blacklist')), note TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
        await client.query(`CREATE TABLE connection_logs (id TEXT PRIMARY KEY, identifier TEXT, ip TEXT, login_type TEXT NOT NULL CHECK(login_type IN ('user','admin')), success INTEGER NOT NULL DEFAULT 0, failure_reason TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
        await client.query(`CREATE INDEX idx_connection_logs_created_at ON connection_logs(created_at)`);
        await client.query(`INSERT OR IGNORE INTO security_settings (key, value) VALUES ('max_attempts', '5')`);
        await client.query(`INSERT OR IGNORE INTO security_settings (key, value) VALUES ('lockout_duration_ms', '900000')`);
        logger.info('Migration 007 executed successfully');
      }

      // Migration 008 — convertir imap_secure/smtp_secure de INTEGER à TEXT enum
      const { rows: secureType } = await client.query(
        "SELECT type FROM pragma_table_info('mail_servers') WHERE name='imap_secure'"
      );
      if (secureType.length > 0 && secureType[0].type.toUpperCase() !== 'TEXT') {
        logger.info('Running migration 008: converting secure columns to TEXT enum...');
        await client.query("PRAGMA foreign_keys = OFF");
        await client.query("CREATE TABLE mail_servers_v2 (id TEXT PRIMARY KEY, domain TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, imap_host TEXT NOT NULL, imap_port INTEGER NOT NULL DEFAULT 993, imap_secure TEXT NOT NULL DEFAULT 'ssl', smtp_host TEXT NOT NULL, smtp_port INTEGER NOT NULL DEFAULT 587, smtp_secure TEXT NOT NULL DEFAULT 'none', smtp_user TEXT NOT NULL, smtp_password_enc TEXT NOT NULL, smtp_password_iv TEXT NOT NULL, smtp_password_tag TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))");
        await client.query("INSERT INTO mail_servers_v2 SELECT id, domain, display_name, imap_host, imap_port, CASE WHEN imap_secure = 1 THEN 'ssl' ELSE 'none' END, smtp_host, smtp_port, CASE WHEN smtp_secure = 1 THEN 'ssl' ELSE 'none' END, smtp_user, smtp_password_enc, smtp_password_iv, smtp_password_tag, created_at, updated_at FROM mail_servers");
        await client.query("DROP TABLE mail_servers");
        await client.query("ALTER TABLE mail_servers_v2 RENAME TO mail_servers");
        await client.query("PRAGMA foreign_keys = ON");
        logger.info('Migration 008 executed successfully');
      }

      // Migration 009 — colonne imap_login_format (idempotente)
      const { rows: loginFormatCol } = await client.query(
        "SELECT name FROM pragma_table_info('mail_servers') WHERE name='imap_login_format'"
      );
      if (loginFormatCol.length === 0) {
        await client.query("ALTER TABLE mail_servers ADD COLUMN imap_login_format TEXT NOT NULL DEFAULT 'full'");
        logger.info('Migration 009 executed successfully');
      }
    } else {
      // Migrations PostgreSQL
      const { rows } = await client.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mail_servers')"
      );

      if (!rows[0].exists) {
        const sqlPath = path.join(__dirname, '..', 'db', 'migrations', '001_create_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');
        await client.query(sql);
        logger.info('Database migration executed successfully');

        const adminMigrationPath = path.join(__dirname, '..', 'db', 'migrations', '002_create_admin_table.sql');
        if (fs.existsSync(adminMigrationPath)) {
          const adminSql = fs.readFileSync(adminMigrationPath, 'utf-8');
          await client.query(adminSql);
          logger.info('Admin migration executed successfully');
        }
      }

      // Migration 003 — credentials SMTP (idempotente)
      const { rows: colRows } = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name='mail_servers' AND column_name='smtp_user'"
      );
      if (colRows.length === 0) {
        const migration3Path = path.join(__dirname, '..', 'db', 'migrations', '003_add_smtp_credentials.sql');
        if (fs.existsSync(migration3Path)) {
          const migration3Sql = fs.readFileSync(migration3Path, 'utf-8');
          await client.query(migration3Sql);
          logger.info('Migration 003 executed successfully');
        }
      }

      // Migration 004 — champ reason sur closure_periods (idempotente)
      const { rows: reasonPgCols } = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name='closure_periods' AND column_name='reason'"
      );
      if (reasonPgCols.length === 0) {
        await client.query("ALTER TABLE closure_periods ADD COLUMN reason TEXT");
        logger.info('Migration 004 executed successfully');
      }

      // Migration 005 — created_by nullable sur closure_periods (idempotente)
      const { rows: createdByPgInfo } = await client.query(
        "SELECT is_nullable FROM information_schema.columns WHERE table_name='closure_periods' AND column_name='created_by'"
      );
      if (createdByPgInfo.length > 0 && createdByPgInfo[0].is_nullable === 'NO') {
        await client.query('ALTER TABLE closure_periods ALTER COLUMN created_by DROP NOT NULL');
        logger.info('Migration 005 executed successfully');
      }

      // Créer l'admin par défaut si aucun admin n'existe
      const { rows: existingAdminsPg } = await client.query("SELECT id FROM admins LIMIT 1");
      if (existingAdminsPg.length === 0) {
        const passwordHash = await bcrypt.hash(config.adminPassword, 10);
        await client.query(
          "INSERT INTO admins (username, password_hash, email) VALUES ('admin', $1, $2)",
          [passwordHash, config.adminEmail || 'admin@emailauto.local']
        );
        logger.info('Default admin created from ADMIN_PASSWORD env variable');
      }

      // Migration 007 — tables de sécurité (idempotente)
      const { rows: secTablesPg } = await client.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='security_settings')"
      );
      if (!secTablesPg[0].exists) {
        await client.query(`CREATE TABLE security_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
        await client.query(`CREATE TABLE ip_rules (id UUID PRIMARY KEY, ip TEXT NOT NULL UNIQUE, type TEXT NOT NULL CHECK(type IN ('whitelist','blacklist')), note TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);
        await client.query(`CREATE TABLE connection_logs (id UUID PRIMARY KEY, identifier TEXT, ip TEXT, login_type TEXT NOT NULL CHECK(login_type IN ('user','admin')), success BOOLEAN NOT NULL DEFAULT FALSE, failure_reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);
        await client.query(`CREATE INDEX idx_connection_logs_created_at ON connection_logs(created_at)`);
        await client.query(`INSERT INTO security_settings (key, value) VALUES ('max_attempts', '5') ON CONFLICT DO NOTHING`);
        await client.query(`INSERT INTO security_settings (key, value) VALUES ('lockout_duration_ms', '900000') ON CONFLICT DO NOTHING`);
        logger.info('Migration 007 executed successfully');
      }

      // Migration 008 — convertir imap_secure/smtp_secure de BOOLEAN à TEXT enum
      const { rows: secureColPg } = await client.query(
        "SELECT data_type FROM information_schema.columns WHERE table_name='mail_servers' AND column_name='imap_secure'"
      );
      if (secureColPg.length > 0 && secureColPg[0].data_type === 'boolean') {
        const migration8Path = path.join(__dirname, '..', 'db', 'migrations', '008_secure_enum.sql');
        const migration8Sql = fs.readFileSync(migration8Path, 'utf-8');
        await client.query(migration8Sql);
        logger.info('Migration 008 executed successfully');
      }

      // Migration 009 — colonne imap_login_format (idempotente)
      const { rows: loginFormatPg } = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name='mail_servers' AND column_name='imap_login_format'"
      );
      if (loginFormatPg.length === 0) {
        await client.query("ALTER TABLE mail_servers ADD COLUMN imap_login_format TEXT NOT NULL DEFAULT 'full'");
        logger.info('Migration 009 executed successfully');
      }
    }
  } catch (error: any) {
    if (error.message && (error.message.includes('already exists') || error.message.includes('duplicate'))) {
      logger.info('Tables already exist, skipping migration');
    } else {
      logger.error('Migration failed:', error);
      throw error;
    }
  } finally {
    client.release();
  }
}

/**
 * Helper pour générer des UUIDs (compatible SQLite et PostgreSQL)
 */
export function generateId(): string {
  return useSqlite ? generateUUID() : 'uuid_generate_v4()';
}

export { useSqlite };
