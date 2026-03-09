-- Migration 009: Add imap_login_format column to mail_servers
ALTER TABLE mail_servers ADD COLUMN imap_login_format TEXT NOT NULL DEFAULT 'full';
