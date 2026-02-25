-- SQLite version of 001_create_tables.sql

CREATE TABLE mail_servers (
    id TEXT PRIMARY KEY,
    domain TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    imap_host TEXT NOT NULL,
    imap_port INTEGER NOT NULL DEFAULT 993,
    imap_secure INTEGER NOT NULL DEFAULT 1,
    smtp_host TEXT NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_secure INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    imap_password_enc TEXT NOT NULL,
    imap_password_iv TEXT NOT NULL,
    imap_password_tag TEXT NOT NULL,
    mail_server_id TEXT NOT NULL REFERENCES mail_servers(id) ON DELETE CASCADE,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE closure_periods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    default_subject TEXT NOT NULL DEFAULT 'Absence automatique',
    default_message TEXT NOT NULL DEFAULT 'Bonjour, je suis actuellement absent. Je reviendrai vers vous dès que possible.',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT check_dates CHECK (end_date > start_date)
);

CREATE TABLE user_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    closure_period_id TEXT NOT NULL REFERENCES closure_periods(id) ON DELETE CASCADE,
    custom_subject TEXT,
    custom_message TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT unique_user_closure UNIQUE (user_id, closure_period_id)
);

CREATE TABLE reply_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    closure_period_id TEXT NOT NULL REFERENCES closure_periods(id) ON DELETE CASCADE,
    original_from TEXT NOT NULL,
    original_message_id TEXT,
    original_subject TEXT,
    replied_at TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT unique_reply UNIQUE (user_id, closure_period_id, original_from)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_mail_server ON users(mail_server_id);
CREATE INDEX idx_closure_periods_dates ON closure_periods(start_date, end_date);
CREATE INDEX idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_subscriptions_closure ON user_subscriptions(closure_period_id);
CREATE INDEX idx_reply_log_lookup ON reply_log(user_id, closure_period_id, original_from);
