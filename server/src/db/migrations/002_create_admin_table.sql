-- Table pour les administrateurs (authentification autonome)
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_admins_username ON admins(username);

-- Insérer un admin par défaut (mot de passe: admin123 - À CHANGER EN PRODUCTION!)
-- Hash bcrypt de 'admin123' avec salt rounds = 10
INSERT INTO admins (username, password_hash, email)
VALUES ('admin', '$2b$10$nYw4Q7wQHQBUNQDH5fnIPOSwKVLP.LkWdsLi9AlVTMuTohf2xnQ0W', 'admin@emailauto.local');

-- Supprimer le rôle admin de la table users
-- Les admins ne sont plus des utilisateurs standard
UPDATE users SET role = 'user' WHERE role = 'admin';

-- Commentaire pour documentation
COMMENT ON TABLE admins IS 'Table pour les administrateurs avec authentification autonome (username/password)';
COMMENT ON COLUMN admins.password_hash IS 'Mot de passe hashé avec bcrypt';
