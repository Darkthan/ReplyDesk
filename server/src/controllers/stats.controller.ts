import { Request, Response } from 'express';
import { pool, useSqlite } from '../config/database';

export const StatsController = {
  async getRepliesPerDay(req: Request, res: Response): Promise<void> {
    const days = Math.min(parseInt(req.query.days as string) || 30, 365);
    const userId = req.query.user_id as string | undefined;

    const values: unknown[] = [];
    let userCondition = '';
    if (userId) {
      userCondition = useSqlite ? 'AND rl.user_id = $1' : 'AND rl.user_id = $1';
      values.push(userId);
    }

    let query: string;
    if (useSqlite) {
      query = `
        SELECT strftime('%Y-%m-%d', rl.replied_at) AS day, COUNT(*) AS count
        FROM reply_log rl
        WHERE rl.replied_at >= datetime('now', '-${days} days')
        ${userCondition}
        GROUP BY 1
        ORDER BY 1
      `;
    } else {
      query = `
        SELECT TO_CHAR(DATE_TRUNC('day', rl.replied_at), 'YYYY-MM-DD') AS day, COUNT(*) AS count
        FROM reply_log rl
        WHERE rl.replied_at >= NOW() - INTERVAL '${days} days'
        ${userCondition}
        GROUP BY 1
        ORDER BY 1
      `;
    }

    const { rows } = await pool.query(query, values);
    res.json(rows.map((r: any) => ({ day: r.day, count: parseInt(r.count, 10) })));
  },

  async getRepliesPerHour(req: Request, res: Response): Promise<void> {
    const days = Math.min(parseInt(req.query.days as string) || 30, 365);
    const userId = req.query.user_id as string | undefined;

    const values: unknown[] = [];
    let userCondition = '';
    if (userId) {
      userCondition = 'AND rl.user_id = $1';
      values.push(userId);
    }

    let query: string;
    if (useSqlite) {
      query = `
        SELECT CAST(strftime('%H', rl.replied_at) AS INTEGER) AS hour, COUNT(*) AS count
        FROM reply_log rl
        WHERE rl.replied_at >= datetime('now', '-${days} days')
        ${userCondition}
        GROUP BY 1
        ORDER BY 1
      `;
    } else {
      query = `
        SELECT EXTRACT(HOUR FROM rl.replied_at)::INTEGER AS hour, COUNT(*) AS count
        FROM reply_log rl
        WHERE rl.replied_at >= NOW() - INTERVAL '${days} days'
        ${userCondition}
        GROUP BY 1
        ORDER BY 1
      `;
    }

    const { rows } = await pool.query(query, values);
    res.json(rows.map((r: any) => ({ hour: parseInt(r.hour, 10), count: parseInt(r.count, 10) })));
  },

  async getTopUsers(req: Request, res: Response): Promise<void> {
    const days = Math.min(parseInt(req.query.days as string) || 30, 365);

    let query: string;
    if (useSqlite) {
      query = `
        SELECT u.id, u.email, COUNT(*) AS count
        FROM reply_log rl
        JOIN users u ON rl.user_id = u.id
        WHERE rl.replied_at >= datetime('now', '-${days} days')
        GROUP BY u.id, u.email
        ORDER BY count DESC
        LIMIT 20
      `;
    } else {
      query = `
        SELECT u.id, u.email, COUNT(*) AS count
        FROM reply_log rl
        JOIN users u ON rl.user_id = u.id
        WHERE rl.replied_at >= NOW() - INTERVAL '${days} days'
        GROUP BY u.id, u.email
        ORDER BY count DESC
        LIMIT 20
      `;
    }

    const { rows } = await pool.query(query, []);
    res.json(rows.map((r: any) => ({ id: r.id, email: r.email, count: parseInt(r.count, 10) })));
  },

  async getUsers(_req: Request, res: Response): Promise<void> {
    const { rows } = await pool.query('SELECT id, email FROM users ORDER BY email ASC');
    res.json(rows);
  },
};
