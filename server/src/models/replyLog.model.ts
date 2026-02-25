import { pool } from '../config/database';
import { generateUUID } from '../config/sqlite-adapter';

export const ReplyLogModel = {
  async hasReplied(userId: string, closurePeriodId: string, originalFrom: string): Promise<boolean> {
    const { rows } = await pool.query(
      'SELECT 1 FROM reply_log WHERE user_id = $1 AND closure_period_id = $2 AND original_from = $3',
      [userId, closurePeriodId, originalFrom.toLowerCase()]
    );
    return rows.length > 0;
  },

  async create(data: {
    user_id: string;
    closure_period_id: string;
    original_from: string;
    original_message_id?: string;
    original_subject?: string;
  }): Promise<void> {
    const id = generateUUID();
    await pool.query(
      'INSERT INTO reply_log (id, user_id, closure_period_id, original_from, original_message_id, original_subject) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id, closure_period_id, original_from) DO NOTHING',
      [id, data.user_id, data.closure_period_id, data.original_from.toLowerCase(), data.original_message_id || null, data.original_subject || null]
    );
  },
};
