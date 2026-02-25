import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface ReplyOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
  inReplyTo?: string;
  references?: string;
}

export async function sendReply(smtp: SmtpConfig, options: ReplyOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
    tls: { rejectUnauthorized: false },
  });

  await transporter.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    inReplyTo: options.inReplyTo,
    references: options.references,
    headers: {
      'Auto-Submitted': 'auto-replied',
      'X-Auto-Response-Suppress': 'All',
      'Precedence': 'bulk',
    },
  });

  logger.info('Auto-reply sent', { from: options.from, to: options.to });
}
