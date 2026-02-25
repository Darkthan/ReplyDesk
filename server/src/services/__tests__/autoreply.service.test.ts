import { processUserAutoReply } from '../autoreply.service';
import * as encryptionService from '../encryption.service';
import * as imapService from '../imap.service';
import * as smtpService from '../smtp.service';
import { ReplyLogModel } from '../../models/replyLog.model';

// Mock des dépendances
jest.mock('../encryption.service');
jest.mock('../imap.service');
jest.mock('../smtp.service');
jest.mock('../../models/replyLog.model');

describe('autoreply.service - processUserAutoReply', () => {
  // Données de test standard
  const mockSubscription = {
    id: 'user-123',
    email: 'user@example.com',
    imap_password_enc: 'encrypted',
    imap_password_iv: 'iv123',
    imap_password_tag: 'tag123',
    closure_period_id: 'period-456',
    custom_subject: null,
    custom_message: null,
    default_subject: 'Absence',
    default_message: 'Je suis absent jusqu\'au 30 janvier.',
    period_start_date: new Date('2024-01-15'),
    imap_host: 'imap.example.com',
    imap_port: 993,
    imap_secure: true,
    smtp_host: 'smtp.example.com',
    smtp_port: 465,
    smtp_secure: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock decrypt par défaut
    (encryptionService.decrypt as jest.Mock).mockReturnValue('decrypted-password');

    // Mock hasReplied par défaut (pas encore répondu)
    (ReplyLogModel.hasReplied as jest.Mock).mockResolvedValue(false);

    // Mock create par défaut
    (ReplyLogModel.create as jest.Mock).mockResolvedValue({});
  });

  describe('Traitement des messages non lus', () => {
    test('doit traiter un message non lu et envoyer une réponse', async () => {
      const mockMessages = [
        {
          from: 'sender@example.com',
          messageId: 'msg-001',
          subject: 'Question importante',
          date: new Date('2024-01-20'),
        },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (smtpService.sendReply as jest.Mock).mockResolvedValue(undefined);

      await processUserAutoReply(mockSubscription);

      // Vérifier que le mot de passe a été déchiffré
      expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted', 'iv123', 'tag123');

      // Vérifier que les messages non lus ont été récupérés
      expect(imapService.fetchUnseenMessages).toHaveBeenCalledWith(
        {
          host: 'imap.example.com',
          port: 993,
          secure: true,
          auth: { user: 'user@example.com', pass: 'decrypted-password' },
        },
        mockSubscription.period_start_date
      );

      // Vérifier qu'on a vérifié si on a déjà répondu
      expect(ReplyLogModel.hasReplied).toHaveBeenCalledWith('user-123', 'period-456', 'sender@example.com');

      // Vérifier que la réponse a été envoyée
      expect(smtpService.sendReply).toHaveBeenCalledWith(
        {
          host: 'smtp.example.com',
          port: 465,
          secure: true,
          auth: { user: 'user@example.com', pass: 'decrypted-password' },
        },
        {
          from: 'user@example.com',
          to: 'sender@example.com',
          subject: 'Re: Question importante - Absence',
          text: 'Je suis absent jusqu\'au 30 janvier.',
          inReplyTo: 'msg-001',
          references: 'msg-001',
        }
      );

      // Vérifier que le log de réponse a été créé
      expect(ReplyLogModel.create).toHaveBeenCalledWith({
        user_id: 'user-123',
        closure_period_id: 'period-456',
        original_from: 'sender@example.com',
        original_message_id: 'msg-001',
        original_subject: 'Question importante',
      });
    });

    test('doit traiter plusieurs messages non lus', async () => {
      const mockMessages = [
        {
          from: 'sender1@example.com',
          messageId: 'msg-001',
          subject: 'Question 1',
          date: new Date('2024-01-20'),
        },
        {
          from: 'sender2@example.com',
          messageId: 'msg-002',
          subject: 'Question 2',
          date: new Date('2024-01-21'),
        },
        {
          from: 'sender3@example.com',
          messageId: 'msg-003',
          subject: 'Question 3',
          date: new Date('2024-01-22'),
        },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (smtpService.sendReply as jest.Mock).mockResolvedValue(undefined);

      await processUserAutoReply(mockSubscription);

      expect(smtpService.sendReply).toHaveBeenCalledTimes(3);
      expect(ReplyLogModel.create).toHaveBeenCalledTimes(3);
    });

    test('ne doit pas traiter si aucun message non lu', async () => {
      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue([]);

      await processUserAutoReply(mockSubscription);

      expect(smtpService.sendReply).not.toHaveBeenCalled();
      expect(ReplyLogModel.create).not.toHaveBeenCalled();
    });
  });

  describe('Gestion des messages déjà traités', () => {
    test('ne doit pas répondre à un message déjà traité', async () => {
      const mockMessages = [
        {
          from: 'sender@example.com',
          messageId: 'msg-001',
          subject: 'Question',
          date: new Date('2024-01-20'),
        },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (ReplyLogModel.hasReplied as jest.Mock).mockResolvedValue(true); // Déjà répondu

      await processUserAutoReply(mockSubscription);

      expect(smtpService.sendReply).not.toHaveBeenCalled();
      expect(ReplyLogModel.create).not.toHaveBeenCalled();
    });

    test('doit répondre uniquement aux nouveaux messages', async () => {
      const mockMessages = [
        {
          from: 'sender1@example.com',
          messageId: 'msg-001',
          subject: 'Question 1',
          date: new Date('2024-01-20'),
        },
        {
          from: 'sender2@example.com',
          messageId: 'msg-002',
          subject: 'Question 2',
          date: new Date('2024-01-21'),
        },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);

      // Premier message déjà traité, second non
      (ReplyLogModel.hasReplied as jest.Mock)
        .mockResolvedValueOnce(true)  // sender1 déjà traité
        .mockResolvedValueOnce(false); // sender2 non traité

      (smtpService.sendReply as jest.Mock).mockResolvedValue(undefined);

      await processUserAutoReply(mockSubscription);

      expect(smtpService.sendReply).toHaveBeenCalledTimes(1);
      expect(smtpService.sendReply).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ to: 'sender2@example.com' })
      );
      expect(ReplyLogModel.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Messages personnalisés', () => {
    test('doit utiliser le sujet personnalisé si fourni', async () => {
      const customSub = {
        ...mockSubscription,
        custom_subject: 'Congés annuels',
      };

      const mockMessages = [
        {
          from: 'sender@example.com',
          messageId: 'msg-001',
          subject: 'Question',
          date: new Date('2024-01-20'),
        },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (smtpService.sendReply as jest.Mock).mockResolvedValue(undefined);

      await processUserAutoReply(customSub);

      expect(smtpService.sendReply).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          subject: 'Re: Question - Congés annuels',
        })
      );
    });

    test('doit utiliser le message personnalisé si fourni', async () => {
      const customSub = {
        ...mockSubscription,
        custom_message: 'Je suis en vacances. Retour le 5 février.',
      };

      const mockMessages = [
        {
          from: 'sender@example.com',
          messageId: 'msg-001',
          subject: 'Question',
          date: new Date('2024-01-20'),
        },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (smtpService.sendReply as jest.Mock).mockResolvedValue(undefined);

      await processUserAutoReply(customSub);

      expect(smtpService.sendReply).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          text: 'Je suis en vacances. Retour le 5 février.',
        })
      );
    });

    test('doit gérer un sujet de message original vide', async () => {
      const mockMessages = [
        {
          from: 'sender@example.com',
          messageId: 'msg-001',
          subject: undefined,
          date: new Date('2024-01-20'),
        },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (smtpService.sendReply as jest.Mock).mockResolvedValue(undefined);

      await processUserAutoReply(mockSubscription);

      expect(smtpService.sendReply).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          subject: 'Re: (sans objet) - Absence',
        })
      );
    });
  });

  describe('Gestion des erreurs', () => {
    test('doit continuer le traitement même si l\'envoi d\'un message échoue', async () => {
      const mockMessages = [
        {
          from: 'sender1@example.com',
          messageId: 'msg-001',
          subject: 'Question 1',
          date: new Date('2024-01-20'),
        },
        {
          from: 'sender2@example.com',
          messageId: 'msg-002',
          subject: 'Question 2',
          date: new Date('2024-01-21'),
        },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);

      // Le premier envoi échoue, le second réussit
      (smtpService.sendReply as jest.Mock)
        .mockRejectedValueOnce(new Error('SMTP error'))
        .mockResolvedValueOnce(undefined);

      await processUserAutoReply(mockSubscription);

      // Les deux tentatives d'envoi doivent avoir lieu
      expect(smtpService.sendReply).toHaveBeenCalledTimes(2);

      // Seul le second message doit créer un log (car le premier a échoué)
      expect(ReplyLogModel.create).toHaveBeenCalledTimes(1);
      expect(ReplyLogModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          original_from: 'sender2@example.com',
        })
      );
    });

    test('ne doit pas créer de log si l\'envoi échoue', async () => {
      const mockMessages = [
        {
          from: 'sender@example.com',
          messageId: 'msg-001',
          subject: 'Question',
          date: new Date('2024-01-20'),
        },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (smtpService.sendReply as jest.Mock).mockRejectedValue(new Error('SMTP error'));

      await processUserAutoReply(mockSubscription);

      expect(ReplyLogModel.create).not.toHaveBeenCalled();
    });
  });
});
