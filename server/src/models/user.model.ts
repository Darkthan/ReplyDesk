import { pool } from '../config/database';
import { generateUUID } from '../config/sqlite-adapter';
import { User } from '../types';

export const UserModel = {
  async findAll(): Promise<Omit<User, 'imap_password_enc' | 'imap_password_iv' | 'imap_password_tag'>[]> {
    const { rows } = await pool.query(
      'SELECT id, email, role, mail_server_id, is_active, created_at, updated_at FROM users ORDER BY email'
    );
    return rows;
  },

  async findById(id: string): Promise<User | null> {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    return rows[0] || null;
  },

  async create(data: {
    email: string;
    role: 'user' | 'admin';
    imap_password_enc: string;
    imap_password_iv: string;
    imap_password_tag: string;
    mail_server_id: string;
  }): Promise<User> {
    const id = generateUUID();
    await pool.query(
      'INSERT INTO users (id, email, role, imap_password_enc, imap_password_iv, imap_password_tag, mail_server_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, data.email.toLowerCase(), data.role, data.imap_password_enc, data.imap_password_iv, data.imap_password_tag, data.mail_server_id]
    );
    return (await this.findById(id))!;
  },

  async updatePassword(id: string, enc: string, iv: string, tag: string): Promise<void> {
    await pool.query(
      'UPDATE users SET imap_password_enc = $1, imap_password_iv = $2, imap_password_tag = $3, updated_at = NOW() WHERE id = $4',
      [enc, iv, tag, id]
    );
  },

  async updateRole(id: string, role: 'user' | 'admin'): Promise<User | null> {
    await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
      [role, id]
    );
    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  },

  async findActiveWithSubscriptions(): Promise<Array<User & {
    subscription_id: string;
    closure_period_id: string;
    closure_name: string;
    custom_subject: string | null;
    custom_message: string | null;
    default_subject: string;
    default_message: string;
    reason: string | null;
    period_start_date: Date;
    period_end_date: Date;
    imap_host: string;
    imap_port: number;
    imap_secure: boolean;
    smtp_host: string;
    smtp_port: number;
    smtp_secure: boolean;
    smtp_user: string;
    smtp_password_enc: string;
    smtp_password_iv: string;
    smtp_password_tag: string;
  }>> {
    const { rows } = await pool.query(`SELECT u.*, us.id AS subscription_id, us.closure_period_id, us.custom_subject, us.custom_message, cp.name AS closure_name, cp.default_subject, cp.default_message, cp.reason, cp.start_date AS period_start_date, cp.end_date AS period_end_date, ms.imap_host, ms.imap_port, ms.imap_secure, ms.smtp_host, ms.smtp_port, ms.smtp_secure, ms.smtp_user, ms.smtp_password_enc, ms.smtp_password_iv, ms.smtp_password_tag FROM users u JOIN user_subscriptions us ON us.user_id = u.id JOIN closure_periods cp ON cp.id = us.closure_period_id JOIN mail_servers ms ON ms.id = u.mail_server_id WHERE u.is_active = true AND us.is_active = true AND cp.is_active = true AND NOW() BETWEEN cp.start_date AND cp.end_date`);
    return rows;
  },
};
