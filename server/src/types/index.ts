export interface MailServer {
  id: string;
  domain: string;
  display_name: string;
  imap_host: string;
  imap_port: number;
  imap_secure: 'ssl' | 'starttls' | 'none';
  smtp_host: string;
  smtp_port: number;
  smtp_secure: 'ssl' | 'starttls' | 'none';
  smtp_user: string;
  smtp_password_enc: string;
  smtp_password_iv: string;
  smtp_password_tag: string;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  imap_password_enc: string;
  imap_password_iv: string;
  imap_password_tag: string;
  mail_server_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ClosurePeriod {
  id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  default_subject: string;
  default_message: string;
  reason: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  closure_period_id: string;
  custom_subject: string | null;
  custom_message: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ReplyLog {
  id: string;
  user_id: string;
  closure_period_id: string;
  original_from: string;
  original_message_id: string | null;
  original_subject: string | null;
  replied_at: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AdminJwtPayload {
  adminId: string;
  username: string;
  type: 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      admin?: AdminJwtPayload;
    }
  }
}
