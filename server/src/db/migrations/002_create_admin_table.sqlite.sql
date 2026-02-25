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

-- Insérer un admin par défaut (mot de passe: admin123 - À CHANGER EN PRODUCTION!)
-- Hash bcrypt de 'admin123' avec salt rounds = 10
INSERT INTO admins (id, username, password_hash, email)
VALUES (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
    'admin',
    '$2b$10$nYw4Q7wQHQBUNQDH5fnIPOSwKVLP.LkWdsLi9AlVTMuTohf2xnQ0W',
    'admin@emailauto.local'
);

-- Supprimer le rôle admin de la table users (si elle existe)
UPDATE users SET role = 'user' WHERE role = 'admin';
