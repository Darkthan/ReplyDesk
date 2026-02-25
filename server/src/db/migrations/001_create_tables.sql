CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE mail_servers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    imap_host VARCHAR(255) NOT NULL,
    imap_port INTEGER NOT NULL DEFAULT 993,
    imap_secure BOOLEAN NOT NULL DEFAULT true,
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_secure BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    imap_password_enc TEXT NOT NULL,
    imap_password_iv TEXT NOT NULL,
    imap_password_tag TEXT NOT NULL,
    mail_server_id UUID NOT NULL REFERENCES mail_servers(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE closure_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    default_subject VARCHAR(500) NOT NULL DEFAULT 'Absence automatique',
    default_message TEXT NOT NULL DEFAULT 'Bonjour, je suis actuellement absent. Je reviendrai vers vous dès que possible.',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_dates CHECK (end_date > start_date)
);

CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    closure_period_id UUID NOT NULL REFERENCES closure_periods(id) ON DELETE CASCADE,
    custom_subject VARCHAR(500),
    custom_message TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_closure UNIQUE (user_id, closure_period_id)
);

CREATE TABLE reply_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    closure_period_id UUID NOT NULL REFERENCES closure_periods(id) ON DELETE CASCADE,
    original_from VARCHAR(255) NOT NULL,
    original_message_id VARCHAR(500),
    original_subject VARCHAR(500),
    replied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_reply UNIQUE (user_id, closure_period_id, original_from)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_mail_server ON users(mail_server_id);
CREATE INDEX idx_closure_periods_dates ON closure_periods(start_date, end_date);
CREATE INDEX idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_subscriptions_closure ON user_subscriptions(closure_period_id);
CREATE INDEX idx_reply_log_lookup ON reply_log(user_id, closure_period_id, original_from);
