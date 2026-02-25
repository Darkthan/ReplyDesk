import { pool } from '../config/database';

export interface Admin {
  id: string;
  username: string;
  password_hash: string;
  email: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export const AdminModel = {
  async findByUsername(username: string): Promise<Admin | null> {
    const { rows } = await pool.query(
      'SELECT * FROM admins WHERE username = $1 AND is_active = true',
      [username.toLowerCase()]
    );
    return rows[0] || null;
  },

  async findById(id: string): Promise<Omit<Admin, 'password_hash'> | null> {
    const { rows } = await pool.query(
      'SELECT id, username, email, is_active, created_at, updated_at FROM admins WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  },

  async create(data: {
    username: string;
    password_hash: string;
    email?: string;
  }): Promise<Omit<Admin, 'password_hash'>> {
    const { rows } = await pool.query(
      `INSERT INTO admins (username, password_hash, email)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, is_active, created_at, updated_at`,
      [data.username.toLowerCase(), data.password_hash, data.email || null]
    );
    return rows[0];
  },

  async updatePassword(id: string, password_hash: string): Promise<void> {
    await pool.query(
      'UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [password_hash, id]
    );
  },

  async findAll(): Promise<Omit<Admin, 'password_hash'>[]> {
    const { rows } = await pool.query(
      'SELECT id, username, email, is_active, created_at, updated_at FROM admins ORDER BY username'
    );
    return rows;
  },

  async updateActive(id: string, is_active: boolean): Promise<void> {
    await pool.query(
      'UPDATE admins SET is_active = $1, updated_at = NOW() WHERE id = $2',
      [is_active, id]
    );
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM admins WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  },
};
