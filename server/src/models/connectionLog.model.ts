import { pool } from '../config/database';
import { generateUUID } from '../config/sqlite-adapter';

export interface ConnectionLog {
  id: string;
  identifier: string | null;
  ip: string | null;
  login_type: 'user' | 'admin';
  success: boolean;
  failure_reason: string | null;
  created_at: string;
}

export interface LogFilters {
  login_type?: 'user' | 'admin';
  success?: boolean;
  limit?: number;
  offset?: number;
}

export const ConnectionLogModel = {
  async create(data: {
    identifier?: string;
    ip?: string;
    login_type: 'user' | 'admin';
    success: boolean;
    failure_reason?: string;
  }): Promise<void> {
    const id = generateUUID();
    await pool.query(
      'INSERT INTO connection_logs (id, identifier, ip, login_type, success, failure_reason) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, data.identifier ?? null, data.ip ?? null, data.login_type, data.success ? 1 : 0, data.failure_reason ?? null]
    );
  },

  async findAll(filters: LogFilters = {}): Promise<{ logs: ConnectionLog[]; total: number }> {
    const { limit = 50, offset = 0 } = filters;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters.login_type !== undefined) {
      conditions.push(`login_type = $${idx++}`);
      values.push(filters.login_type);
    }
    if (filters.success !== undefined) {
      conditions.push(`success = $${idx++}`);
      values.push(filters.success ? 1 : 0);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) as total FROM connection_logs ${where}`,
      values
    );
    const total = parseInt(countRows[0].total, 10);

    const { rows } = await pool.query(
      `SELECT * FROM connection_logs ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    // Normaliser le champ success (SQLite retourne 0/1, PostgreSQL retourne boolean)
    const logs: ConnectionLog[] = rows.map((r: any) => ({
      ...r,
      success: r.success === true || r.success === 1,
    }));

    return { logs, total };
  },

  async deleteAll(): Promise<void> {
    await pool.query('DELETE FROM connection_logs');
  },
};
