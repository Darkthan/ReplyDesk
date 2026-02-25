import { pool } from '../config/database';
import { generateUUID } from '../config/sqlite-adapter';
import { UserSubscription } from '../types';

export const SubscriptionModel = {
  async findByUser(userId: string): Promise<(UserSubscription & { closure_name: string; start_date: Date; end_date: Date; default_subject: string; default_message: string })[]> {
    const { rows } = await pool.query(
      `SELECT us.*, cp.name AS closure_name, cp.start_date, cp.end_date, cp.default_subject, cp.default_message
       FROM user_subscriptions us
       JOIN closure_periods cp ON cp.id = us.closure_period_id
       WHERE us.user_id = $1
       ORDER BY cp.start_date DESC`,
      [userId]
    );
    return rows;
  },

  async findById(id: string): Promise<UserSubscription | null> {
    const { rows } = await pool.query('SELECT * FROM user_subscriptions WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async create(data: {
    user_id: string;
    closure_period_id: string;
    custom_subject?: string;
    custom_message?: string;
  }): Promise<UserSubscription> {
    const id = generateUUID();
    await pool.query(
      'INSERT INTO user_subscriptions (id, user_id, closure_period_id, custom_subject, custom_message) VALUES ($1, $2, $3, $4, $5)',
      [id, data.user_id, data.closure_period_id, data.custom_subject || null, data.custom_message || null]
    );
    return (await this.findById(id))!;
  },

  async update(id: string, data: { custom_subject?: string | null; custom_message?: string | null; is_active?: boolean }): Promise<UserSubscription | null> {
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
      `UPDATE user_subscriptions SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );
    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM user_subscriptions WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  },
};
