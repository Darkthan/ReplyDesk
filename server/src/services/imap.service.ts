import { ImapFlow } from 'imapflow';
import { logger } from '../utils/logger';

interface ImapConfig {
  host: string;
  port: number;
  secure: 'ssl' | 'starttls' | 'none';
  auth: {
    user: string;
    pass: string;
  };
}

function buildImapFlowOptions(cfg: ImapConfig) {
  return {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure === 'ssl',
    requireTLS: cfg.secure === 'starttls',
    auth: cfg.auth,
    logger: false as const,
    tls: { rejectUnauthorized: false },
  };
}

export type ImapValidationResult =
  | { ok: true }
  | { ok: false; reason: 'unreachable' | 'auth_failed' | 'unknown'; message: string };

export async function validateImapCredentials(cfg: ImapConfig): Promise<ImapValidationResult> {
  const client = new ImapFlow(buildImapFlowOptions(cfg));

  try {
    await client.connect();
    await client.logout();
    return { ok: true };
  } catch (err: any) {
    const msg: string = err.message || '';
    logger.debug('IMAP validation failed', { host: cfg.host, user: cfg.auth.user, error: msg });

    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
      return { ok: false, reason: 'unreachable', message: `Serveur IMAP inaccessible (${cfg.host}:${cfg.port}) — ${msg}` };
    }
    if (/auth|login|credential|password|username|invalid|535|534|530/i.test(msg)) {
      return { ok: false, reason: 'auth_failed', message: 'Identifiants incorrects (email ou mot de passe IMAP)' };
    }
    return { ok: false, reason: 'unknown', message: msg };
  }
}

export interface UnseenMessage {
  from: string;
  messageId: string | undefined;
  subject: string | undefined;
  date: Date | undefined;
}

export async function fetchUnseenMessages(cfg: ImapConfig, since: Date): Promise<UnseenMessage[]> {
  const client = new ImapFlow(buildImapFlowOptions(cfg));

  const messages: UnseenMessage[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const searchCriteria = { unseen: true, since };

      for await (const msg of client.fetch(searchCriteria, { envelope: true })) {
        const envelope = msg.envelope;
        if (!envelope?.from?.[0]?.address) continue;

        const fromAddress = envelope.from[0].address.toLowerCase();

        // Skip auto-replies, bounces, noreply
        if (isAutoReply(fromAddress, envelope)) continue;

        messages.push({
          from: fromAddress,
          messageId: envelope.messageId,
          subject: envelope.subject,
          date: envelope.date,
        });
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    logger.error('IMAP fetch failed', { host: cfg.host, error: (err as Error).message });
    try { await client.logout(); } catch { /* ignore */ }
  }

  return messages;
}

function isAutoReply(from: string, envelope: { inReplyTo?: string; subject?: string }): boolean {
  const noReplyPatterns = [
    'noreply', 'no-reply', 'donotreply', 'do-not-reply',
    'bounce', 'mailer-daemon', 'postmaster',
  ];

  if (noReplyPatterns.some(p => from.includes(p))) return true;

  const subject = (envelope.subject || '').toLowerCase();
  if (subject.startsWith('auto:') || subject.includes('automatic reply') || subject.includes('out of office')) {
    return true;
  }

  return false;
}
