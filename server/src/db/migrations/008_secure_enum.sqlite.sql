-- Migration 005 (SQLite): Convert imap_secure and smtp_secure from INTEGER to TEXT enum
-- SQLite doesn't support ALTER COLUMN TYPE, so we use a table rebuild approach

-- 1. Create new table with TEXT columns
CREATE TABLE mail_servers_new (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  imap_host TEXT NOT NULL,
  imap_port INTEGER NOT NULL DEFAULT 993,
  imap_secure TEXT NOT NULL DEFAULT 'ssl',
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_secure TEXT NOT NULL DEFAULT 'none',
  smtp_user TEXT NOT NULL,
  smtp_password_enc TEXT NOT NULL,
  smtp_password_iv TEXT NOT NULL,
  smtp_password_tag TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Copy data with conversion
INSERT INTO mail_servers_new
  SELECT
    id, domain, display_name,
    imap_host, imap_port,
    CASE WHEN imap_secure = 1 THEN 'ssl' ELSE 'none' END,
    smtp_host, smtp_port,
    CASE WHEN smtp_secure = 1 THEN 'ssl' ELSE 'none' END,
    smtp_user, smtp_password_enc, smtp_password_iv, smtp_password_tag,
    created_at, updated_at
  FROM mail_servers;

-- 3. Drop old table and rename
DROP TABLE mail_servers;
ALTER TABLE mail_servers_new RENAME TO mail_servers;
