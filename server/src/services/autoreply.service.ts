import { decrypt } from './encryption.service';
import { fetchUnseenMessages } from './imap.service';
import { sendReply } from './smtp.service';
import { ReplyLogModel } from '../models/replyLog.model';
import { logger } from '../utils/logger';

interface SubscriptionData {
  id: string;
  subscription_id: string;
  email: string;
  // Credentials IMAP de l'utilisateur
  imap_password_enc: string;
  imap_password_iv: string;
  imap_password_tag: string;
  // Période de fermeture
  closure_period_id: string;
  closure_name: string;
  custom_subject: string | null;
  custom_message: string | null;
  default_subject: string;
  default_message: string;
  reason: string | null;
  period_start_date: Date;
  period_end_date: Date;
  // Config réseau du serveur
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  // Credentials SMTP dédiés du serveur (relay)
  smtp_user: string;
  smtp_password_enc: string;
  smtp_password_iv: string;
  smtp_password_tag: string;
}

const TEMPLATE_VARS: Record<string, (sub: SubscriptionData) => string> = {
  '{{raison}}':      (s) => s.reason || '',
  '{{periode}}':     (s) => s.closure_name || '',
  '{{date_debut}}':  (s) => new Date(s.period_start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
  '{{date_fin}}':    (s) => new Date(s.period_end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
};

function resolveVars(text: string, sub: SubscriptionData): string {
  let result = text;
  for (const [placeholder, fn] of Object.entries(TEMPLATE_VARS)) {
    result = result.split(placeholder).join(fn(sub));
  }
  return result;
}

export async function processUserAutoReply(sub: SubscriptionData): Promise<void> {
  const imapPassword = decrypt(sub.imap_password_enc, sub.imap_password_iv, sub.imap_password_tag);
  const smtpPassword = decrypt(sub.smtp_password_enc, sub.smtp_password_iv, sub.smtp_password_tag);

  const imapCfg = {
    host: sub.imap_host,
    port: sub.imap_port,
    secure: sub.imap_secure,
    auth: { user: sub.email, pass: imapPassword },
  };

  // Le SMTP s'authentifie avec le compte relay du serveur,
  // mais envoie au nom de l'utilisateur (From = email utilisateur)
  const smtpCfg = {
    host: sub.smtp_host,
    port: sub.smtp_port,
    secure: sub.smtp_secure,
    auth: { user: sub.smtp_user, pass: smtpPassword },
  };

  const messages = await fetchUnseenMessages(imapCfg, new Date(sub.period_start_date));

  const rawSubject = sub.custom_subject || sub.default_subject;
  const rawMessage = sub.custom_message || sub.default_message;

  const replySubject = resolveVars(rawSubject, sub);
  const replyMessage = resolveVars(rawMessage, sub);

  for (const msg of messages) {
    const alreadyReplied = await ReplyLogModel.hasReplied(sub.id, sub.closure_period_id, msg.from);
    if (alreadyReplied) continue;

    try {
      await sendReply(smtpCfg, {
        from: sub.email,   // identité de l'utilisateur
        to: msg.from,
        subject: `Re: ${msg.subject || '(sans objet)'} - ${replySubject}`,
        text: replyMessage,
        inReplyTo: msg.messageId,
        references: msg.messageId,
      });

      await ReplyLogModel.create({
        user_id: sub.id,
        closure_period_id: sub.closure_period_id,
        original_from: msg.from,
        original_message_id: msg.messageId,
        original_subject: msg.subject,
      });
    } catch (err) {
      logger.error('Failed to send auto-reply', {
        user: sub.email,
        to: msg.from,
        error: (err as Error).message,
      });
    }
  }
}
