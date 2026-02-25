import { validateImapCredentials, fetchUnseenMessages } from '../imap.service';
import { ImapFlow } from 'imapflow';

// Mock d'ImapFlow
jest.mock('imapflow');

describe('imap.service', () => {
  let mockImapClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Créer un mock du client IMAP
    mockImapClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      logout: jest.fn().mockResolvedValue(undefined),
      getMailboxLock: jest.fn(),
      fetch: jest.fn(),
    };

    // Mock du constructeur ImapFlow
    (ImapFlow as jest.MockedClass<typeof ImapFlow>).mockImplementation(() => mockImapClient);
  });

  describe('validateImapCredentials', () => {
    const validConfig = {
      host: 'imap.example.com',
      port: 993,
      secure: true,
      auth: {
        user: 'user@example.com',
        pass: 'password123',
      },
    };

    test('doit retourner true pour des identifiants valides', async () => {
      const result = await validateImapCredentials(validConfig);

      expect(ImapFlow).toHaveBeenCalledWith({
        host: validConfig.host,
        port: validConfig.port,
        secure: validConfig.secure,
        auth: validConfig.auth,
        logger: false,
      });
      expect(mockImapClient.connect).toHaveBeenCalled();
      expect(mockImapClient.logout).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('doit retourner false si la connexion échoue', async () => {
      mockImapClient.connect.mockRejectedValue(new Error('Connection failed'));

      const result = await validateImapCredentials(validConfig);

      expect(result).toBe(false);
    });

    test('doit retourner false si l\'authentification échoue', async () => {
      mockImapClient.connect.mockRejectedValue(new Error('Authentication failed'));

      const result = await validateImapCredentials({
        ...validConfig,
        auth: { user: 'user@example.com', pass: 'wrongpassword' },
      });

      expect(result).toBe(false);
    });

    test('doit retourner false pour un hôte invalide', async () => {
      mockImapClient.connect.mockRejectedValue(new Error('Host not found'));

      const result = await validateImapCredentials({
        ...validConfig,
        host: 'invalid.host.com',
      });

      expect(result).toBe(false);
    });

    test('doit gérer les erreurs de timeout', async () => {
      mockImapClient.connect.mockRejectedValue(new Error('Timeout'));

      const result = await validateImapCredentials(validConfig);

      expect(result).toBe(false);
    });
  });

  describe('fetchUnseenMessages', () => {
    const validConfig = {
      host: 'imap.example.com',
      port: 993,
      secure: true,
      auth: {
        user: 'user@example.com',
        pass: 'password123',
      },
    };

    const sinceDate = new Date('2024-01-01');

    test('doit récupérer les messages non lus', async () => {
      const mockLock = {
        release: jest.fn(),
      };

      const mockMessages = [
        {
          envelope: {
            from: [{ address: 'sender1@example.com' }],
            messageId: 'msg-001',
            subject: 'Test Subject 1',
            date: new Date('2024-01-15'),
          },
        },
        {
          envelope: {
            from: [{ address: 'sender2@example.com' }],
            messageId: 'msg-002',
            subject: 'Test Subject 2',
            date: new Date('2024-01-16'),
          },
        },
      ];

      mockImapClient.getMailboxLock.mockResolvedValue(mockLock);

      // Mock d'un async iterable
      mockImapClient.fetch.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const msg of mockMessages) {
            yield msg;
          }
        },
      });

      const result = await fetchUnseenMessages(validConfig, sinceDate);

      expect(mockImapClient.connect).toHaveBeenCalled();
      expect(mockImapClient.getMailboxLock).toHaveBeenCalledWith('INBOX');
      expect(mockImapClient.fetch).toHaveBeenCalledWith(
        { unseen: true, since: sinceDate },
        { envelope: true }
      );
      expect(mockLock.release).toHaveBeenCalled();
      expect(mockImapClient.logout).toHaveBeenCalled();

      expect(result).toEqual([
        {
          from: 'sender1@example.com',
          messageId: 'msg-001',
          subject: 'Test Subject 1',
          date: new Date('2024-01-15'),
        },
        {
          from: 'sender2@example.com',
          messageId: 'msg-002',
          subject: 'Test Subject 2',
          date: new Date('2024-01-16'),
        },
      ]);
    });

    test('doit filtrer les messages de noreply', async () => {
      const mockLock = { release: jest.fn() };

      const mockMessages = [
        {
          envelope: {
            from: [{ address: 'noreply@example.com' }],
            messageId: 'msg-001',
            subject: 'Test',
            date: new Date('2024-01-15'),
          },
        },
        {
          envelope: {
            from: [{ address: 'sender@example.com' }],
            messageId: 'msg-002',
            subject: 'Test',
            date: new Date('2024-01-16'),
          },
        },
      ];

      mockImapClient.getMailboxLock.mockResolvedValue(mockLock);
      mockImapClient.fetch.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const msg of mockMessages) {
            yield msg;
          }
        },
      });

      const result = await fetchUnseenMessages(validConfig, sinceDate);

      // Seul le second message (non-noreply) doit être retourné
      expect(result).toHaveLength(1);
      expect(result[0].from).toBe('sender@example.com');
    });

    test('doit filtrer les messages avec sujet "Out of Office"', async () => {
      const mockLock = { release: jest.fn() };

      const mockMessages = [
        {
          envelope: {
            from: [{ address: 'sender1@example.com' }],
            messageId: 'msg-001',
            subject: 'Out of Office',
            date: new Date('2024-01-15'),
          },
        },
        {
          envelope: {
            from: [{ address: 'sender2@example.com' }],
            messageId: 'msg-002',
            subject: 'Normal message',
            date: new Date('2024-01-16'),
          },
        },
      ];

      mockImapClient.getMailboxLock.mockResolvedValue(mockLock);
      mockImapClient.fetch.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const msg of mockMessages) {
            yield msg;
          }
        },
      });

      const result = await fetchUnseenMessages(validConfig, sinceDate);

      expect(result).toHaveLength(1);
      expect(result[0].subject).toBe('Normal message');
    });

    test('doit retourner un tableau vide si aucun message non lu', async () => {
      const mockLock = { release: jest.fn() };

      mockImapClient.getMailboxLock.mockResolvedValue(mockLock);
      mockImapClient.fetch.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          // Aucun message
        },
      });

      const result = await fetchUnseenMessages(validConfig, sinceDate);

      expect(result).toEqual([]);
    });

    test('doit gérer les erreurs de connexion', async () => {
      mockImapClient.connect.mockRejectedValue(new Error('Connection failed'));

      const result = await fetchUnseenMessages(validConfig, sinceDate);

      expect(result).toEqual([]);
    });

    test('doit convertir les adresses en minuscules', async () => {
      const mockLock = { release: jest.fn() };

      const mockMessages = [
        {
          envelope: {
            from: [{ address: 'Sender@EXAMPLE.COM' }],
            messageId: 'msg-001',
            subject: 'Test',
            date: new Date('2024-01-15'),
          },
        },
      ];

      mockImapClient.getMailboxLock.mockResolvedValue(mockLock);
      mockImapClient.fetch.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const msg of mockMessages) {
            yield msg;
          }
        },
      });

      const result = await fetchUnseenMessages(validConfig, sinceDate);

      expect(result[0].from).toBe('sender@example.com');
    });

    test('doit ignorer les messages sans adresse from', async () => {
      const mockLock = { release: jest.fn() };

      const mockMessages = [
        {
          envelope: {
            from: [{ address: undefined }],
            messageId: 'msg-001',
            subject: 'Test',
            date: new Date('2024-01-15'),
          },
        },
        {
          envelope: {
            from: [{ address: 'valid@example.com' }],
            messageId: 'msg-002',
            subject: 'Test',
            date: new Date('2024-01-16'),
          },
        },
      ];

      mockImapClient.getMailboxLock.mockResolvedValue(mockLock);
      mockImapClient.fetch.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const msg of mockMessages) {
            yield msg;
          }
        },
      });

      const result = await fetchUnseenMessages(validConfig, sinceDate);

      expect(result).toHaveLength(1);
      expect(result[0].from).toBe('valid@example.com');
    });
  });
});
