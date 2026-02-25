-- Ajout des credentials SMTP dédiés sur les serveurs mail
ALTER TABLE mail_servers ADD COLUMN smtp_user VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE mail_servers ADD COLUMN smtp_password_enc TEXT NOT NULL DEFAULT '';
ALTER TABLE mail_servers ADD COLUMN smtp_password_iv TEXT NOT NULL DEFAULT '';
ALTER TABLE mail_servers ADD COLUMN smtp_password_tag TEXT NOT NULL DEFAULT '';
