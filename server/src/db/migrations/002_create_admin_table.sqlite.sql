-- SQLite version of 002_create_admin_table.sql

CREATE TABLE admins (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_admins_username ON admins(username);

-- Supprimer le rôle admin de la table users (si elle existe)
UPDATE users SET role = 'user' WHERE role = 'admin';
