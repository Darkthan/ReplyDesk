import { pool } from '../config/database';
import { generateUUID } from '../config/sqlite-adapter';
import { ClosurePeriod } from '../types';

export const ClosureModel = {
  async findAll(): Promise<ClosurePeriod[]> {
    const { rows } = await pool.query('SELECT * FROM closure_periods WHERE created_by IS NULL ORDER BY start_date DESC');
    return rows;
  },

  async findByUser(userId: string): Promise<ClosurePeriod[]> {
    const { rows } = await pool.query('SELECT * FROM closure_periods WHERE created_by = $1 ORDER BY start_date DESC', [userId]);
    return rows;
  },

  async findById(id: string): Promise<ClosurePeriod | null> {
    const { rows } = await pool.query('SELECT * FROM closure_periods WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async findActive(): Promise<ClosurePeriod[]> {
    const { rows } = await pool.query(
      "SELECT * FROM closure_periods WHERE is_active = true AND end_date > NOW() ORDER BY start_date"
    );
    return rows;
  },

  async create(data: {
    name: string;
    start_date: Date;
    end_date: Date;
    default_subject: string;
    default_message: string;
    reason?: string | null;
    created_by: string | null;
  }): Promise<ClosurePeriod> {
    const id = generateUUID();
    await pool.query(
      'INSERT INTO closure_periods (id, name, start_date, end_date, default_subject, default_message, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, data.name, data.start_date, data.end_date, data.default_subject, data.default_message, data.reason || null, data.created_by]
    );
    return (await this.findById(id))!;
  },

  async update(id: string, data: Partial<Pick<ClosurePeriod, 'name' | 'start_date' | 'end_date' | 'default_subject' | 'default_message' | 'reason' | 'is_active'>>): Promise<ClosurePeriod | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await pool.query(
      `UPDATE closure_periods SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );
    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM closure_periods WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  },
};
