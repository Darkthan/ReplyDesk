import { pool } from '../config/database';

export const SecuritySettingsModel = {
  async get(key: string): Promise<string | null> {
    const { rows } = await pool.query('SELECT value FROM security_settings WHERE key = $1', [key]);
    return rows[0]?.value ?? null;
  },

  async set(key: string, value: string): Promise<void> {
    await pool.query(
      'INSERT INTO security_settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2',
      [key, value]
    );
  },

  async getAll(): Promise<Record<string, string>> {
    const { rows } = await pool.query('SELECT key, value FROM security_settings');
    return Object.fromEntries(rows.map((r: { key: string; value: string }) => [r.key, r.value]));
  },
};
