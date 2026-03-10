import { sendReply } from '../smtp.service';
import nodemailer from 'nodemailer';

// Mock de nodemailer
jest.mock('nodemailer');

describe('smtp.service - sendReply', () => {
  let mockTransporter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock du transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'sent-message-id' }),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
  });

  const mockSmtpConfig = {
    host: 'smtp.example.com',
    port: 465,
    secure: 'ssl' as const,
    auth: {
      user: 'user@example.com',
      pass: 'password123',
    },
  };

  test('doit envoyer une réponse automatique avec succès', async () => {
    const replyOptions = {
      from: 'user@example.com',
      to: 'sender@example.com',
      subject: 'Re: Question - Absence',
      text: 'Je suis absent jusqu\'au 30 janvier.',
      inReplyTo: 'original-message-id',
      references: 'original-message-id',
    };

    await sendReply(mockSmtpConfig, replyOptions);

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: mockSmtpConfig.host,
      port: mockSmtpConfig.port,
      secure: true,
      requireTLS: false,
      ignoreTLS: false,
      auth: mockSmtpConfig.auth,
      tls: { rejectUnauthorized: false },
    });

    expect(mockTransporter.sendMail).toHaveBeenCalledWith({
      from: replyOptions.from,
      to: replyOptions.to,
      subject: replyOptions.subject,
      text: replyOptions.text,
      inReplyTo: replyOptions.inReplyTo,
      references: replyOptions.references,
      headers: {
        'Auto-Submitted': 'auto-replied',
        'X-Auto-Response-Suppress': 'All',
        'Precedence': 'bulk',
      },
    });
  });

  test('doit inclure les headers appropriés pour une auto-réponse', async () => {
    const replyOptions = {
      from: 'user@example.com',
      to: 'sender@example.com',
      subject: 'Test',
      text: 'Message de test',
    };

    await sendReply(mockSmtpConfig, replyOptions);

    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          'Auto-Submitted': 'auto-replied',
          'X-Auto-Response-Suppress': 'All',
          'Precedence': 'bulk',
        },
      })
    );
  });

  test('doit gérer les options sans inReplyTo ni references', async () => {
    const replyOptions = {
      from: 'user@example.com',
      to: 'sender@example.com',
      subject: 'Test',
      text: 'Message de test',
    };

    await sendReply(mockSmtpConfig, replyOptions);

    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: replyOptions.from,
        to: replyOptions.to,
        subject: replyOptions.subject,
        text: replyOptions.text,
        inReplyTo: undefined,
        references: undefined,
      })
    );
  });

  test('doit propager les erreurs SMTP', async () => {
    mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error: Connection refused'));

    const replyOptions = {
      from: 'user@example.com',
      to: 'sender@example.com',
      subject: 'Test',
      text: 'Message de test',
    };

    await expect(sendReply(mockSmtpConfig, replyOptions)).rejects.toThrow('SMTP Error: Connection refused');
  });

  test('doit gérer les erreurs d\'authentification', async () => {
    mockTransporter.sendMail.mockRejectedValue(new Error('Authentication failed'));

    const replyOptions = {
      from: 'user@example.com',
      to: 'sender@example.com',
      subject: 'Test',
      text: 'Message de test',
    };

    await expect(sendReply(mockSmtpConfig, replyOptions)).rejects.toThrow('Authentication failed');
  });

  test('doit gérer les erreurs de destinataire invalide', async () => {
    mockTransporter.sendMail.mockRejectedValue(new Error('Invalid recipient'));

    const replyOptions = {
      from: 'user@example.com',
      to: 'invalid-email',
      subject: 'Test',
      text: 'Message de test',
    };

    await expect(sendReply(mockSmtpConfig, replyOptions)).rejects.toThrow('Invalid recipient');
  });

  test('doit créer un transporter avec la configuration correcte', async () => {
    const customConfig = {
      host: 'custom-smtp.com',
      port: 587,
      secure: 'starttls' as const,
      auth: {
        user: 'custom@example.com',
        pass: 'custompass',
      },
    };

    const replyOptions = {
      from: 'custom@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
      text: 'Message',
    };

    await sendReply(customConfig, replyOptions);

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'custom-smtp.com',
      port: 587,
      secure: false,
      requireTLS: true,
      ignoreTLS: false,
      auth: {
        user: 'custom@example.com',
        pass: 'custompass',
      },
      tls: { rejectUnauthorized: false },
    });
  });

  test('doit gérer les messages avec des caractères spéciaux', async () => {
    const replyOptions = {
      from: 'user@example.com',
      to: 'sender@example.com',
      subject: 'Re: Question urgente avec des accents éèêë',
      text: 'Réponse avec des caractères spéciaux: €, £, ¥, © et des emojis 😀',
    };

    await sendReply(mockSmtpConfig, replyOptions);

    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: replyOptions.subject,
        text: replyOptions.text,
      })
    );
  });

  test('doit gérer les messages longs', async () => {
    const longText = 'a'.repeat(10000);
    const replyOptions = {
      from: 'user@example.com',
      to: 'sender@example.com',
      subject: 'Test',
      text: longText,
    };

    await sendReply(mockSmtpConfig, replyOptions);

    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: longText,
      })
    );
  });

  test('doit envoyer à plusieurs destinataires séparément', async () => {
    const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];

    for (const recipient of recipients) {
      await sendReply(mockSmtpConfig, {
        from: 'user@example.com',
        to: recipient,
        subject: 'Test',
        text: 'Message',
      });
    }

    expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
  });
});
