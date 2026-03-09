-- Migration 005: Convert imap_secure and smtp_secure from BOOLEAN to TEXT enum
-- Values: 'ssl' | 'starttls' | 'none'

ALTER TABLE mail_servers
  ALTER COLUMN imap_secure TYPE TEXT USING CASE WHEN imap_secure THEN 'ssl' ELSE 'none' END,
  ALTER COLUMN smtp_secure TYPE TEXT USING CASE WHEN smtp_secure THEN 'ssl' ELSE 'none' END;

-- Set defaults
ALTER TABLE mail_servers
  ALTER COLUMN imap_secure SET DEFAULT 'ssl',
  ALTER COLUMN smtp_secure SET DEFAULT 'none';
