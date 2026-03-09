import { pool, useSqlite } from '../config/database';
import { generateUUID } from '../config/sqlite-adapter';
import { MailServer } from '../types';

// Champs retournés dans les réponses API (sans le mot de passe chiffré)
// Note: doit tenir sur une seule ligne pour que l'adaptateur SQLite parse correctement RETURNING
const PUBLIC_FIELDS = 'id, domain, display_name, imap_host, imap_port, imap_secure, imap_login_format, smtp_host, smtp_port, smtp_secure, smtp_user, created_at, updated_at';

export type MailServerPublic = Omit<MailServer, 'smtp_password_enc' | 'smtp_password_iv' | 'smtp_password_tag'>;

export const ServerModel = {
  async findAll(): Promise<MailServerPublic[]> {
    const { rows } = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM mail_servers ORDER BY domain`);
    return rows;
  },

  async findById(id: string): Promise<MailServerPublic | null> {
    const { rows } = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM mail_servers WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async findByIdFull(id: string): Promise<MailServer | null> {
    const { rows } = await pool.query('SELECT * FROM mail_servers WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async findByDomain(domain: string): Promise<MailServerPublic | null> {
    const { rows } = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM mail_servers WHERE domain = $1`, [domain.toLowerCase()]);
    return rows[0] || null;
  },

  async create(data: Omit<MailServer, 'id' | 'created_at' | 'updated_at'>): Promise<MailServerPublic> {
    const id = generateUUID();
    const { rows } = await pool.query(
      `INSERT INTO mail_servers (id, domain, display_name, imap_host, imap_port, imap_secure, imap_login_format, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password_enc, smtp_password_iv, smtp_password_tag) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING ${PUBLIC_FIELDS}`,
      [
        id,
        data.domain.toLowerCase(), data.display_name,
        data.imap_host, data.imap_port, data.imap_secure, data.imap_login_format,
        data.smtp_host, data.smtp_port, data.smtp_secure,
        data.smtp_user, data.smtp_password_enc, data.smtp_password_iv, data.smtp_password_tag,
      ]
    );
    return rows[0];
  },

  async update(id: string, data: Partial<Omit<MailServer, 'id' | 'created_at' | 'updated_at'>>): Promise<MailServerPublic | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(key === 'domain' ? (value as string).toLowerCase() : value);
        idx++;
      }
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await pool.query(
      `UPDATE mail_servers SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );
    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM mail_servers WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  },
};
