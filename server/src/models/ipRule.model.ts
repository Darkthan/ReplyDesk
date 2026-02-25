import { pool } from '../config/database';
import { generateUUID } from '../config/sqlite-adapter';

export interface IpRule {
  id: string;
  ip: string;
  type: 'whitelist' | 'blacklist';
  note: string | null;
  created_at: string;
}

export const IpRuleModel = {
  async findAll(): Promise<IpRule[]> {
    const { rows } = await pool.query('SELECT * FROM ip_rules ORDER BY created_at DESC');
    return rows;
  },

  async findByIp(ip: string): Promise<IpRule | null> {
    const { rows } = await pool.query('SELECT * FROM ip_rules WHERE ip = $1', [ip]);
    return rows[0] || null;
  },

  async create(data: { ip: string; type: 'whitelist' | 'blacklist'; note?: string }): Promise<IpRule> {
    const id = generateUUID();
    await pool.query(
      'INSERT INTO ip_rules (id, ip, type, note) VALUES ($1, $2, $3, $4)',
      [id, data.ip, data.type, data.note ?? null]
    );
    return (await this.findByIp(data.ip))!;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM ip_rules WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  },
};
