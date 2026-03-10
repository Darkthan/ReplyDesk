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
  // Données de test standard (correspond à l'interface SubscriptionData du service)
  const mockSubscription = {
    id: 'user-123',
    subscription_id: 'sub-789',
    email: 'user@example.com',
    imap_password_enc: 'encrypted-imap',
    imap_password_iv: 'iv-imap',
    imap_password_tag: 'tag-imap',
    closure_period_id: 'period-456',
    closure_name: 'Congés scolaires',
    custom_subject: null,
    custom_message: null,
    default_subject: 'Absence',
    default_message: 'Je suis absent.',
    reason: null,
    period_start_date: new Date('2024-01-15'),
    period_end_date: new Date('2024-01-31'),
    imap_host: 'imap.example.com',
    imap_port: 993,
    imap_secure: 'ssl' as const,
    imap_login_format: 'full' as const,
    smtp_host: 'smtp.example.com',
    smtp_port: 465,
    smtp_secure: 'ssl' as const,
    smtp_user: 'relay@example.com',
    smtp_password_enc: 'encrypted-smtp',
    smtp_password_iv: 'iv-smtp',
    smtp_password_tag: 'tag-smtp',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // decrypt retourne des valeurs différentes selon les paramètres
    (encryptionService.decrypt as jest.Mock).mockImplementation((enc: string) => {
      if (enc === 'encrypted-imap') return 'decrypted-imap-password';
      if (enc === 'encrypted-smtp') return 'decrypted-smtp-password';
      return 'decrypted';
    });

    // Par défaut : pas encore répondu
    (ReplyLogModel.hasReplied as jest.Mock).mockResolvedValue(false);
    (ReplyLogModel.create as jest.Mock).mockResolvedValue({});
  });

  describe('Traitement des messages non lus', () => {
    test('doit déchiffrer les deux mots de passe (IMAP et SMTP relay)', async () => {
      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue([]);

      await processUserAutoReply(mockSubscription);

      expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted-imap', 'iv-imap', 'tag-imap');
      expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted-smtp', 'iv-smtp', 'tag-smtp');
    });

    test('doit récupérer les messages IMAP avec les bons paramètres', async () => {
      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue([]);

      await processUserAutoReply(mockSubscription);

      expect(imapService.fetchUnseenMessages).toHaveBeenCalledWith(
        {
          host: 'imap.example.com',
          port: 993,
          secure: 'ssl',
          auth: { user: 'user@example.com', pass: 'decrypted-imap-password' },
        },
        expect.any(Date)
      );
    });

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

      // Vérifier la vérification anti-doublon
      expect(ReplyLogModel.hasReplied).toHaveBeenCalledWith('user-123', 'period-456', 'sender@example.com');

      // La réponse SMTP utilise le relay (smtp_user) et envoie au nom de l'utilisateur
      expect(smtpService.sendReply).toHaveBeenCalledWith(
        {
          host: 'smtp.example.com',
          port: 465,
          secure: 'ssl',
          auth: { user: 'relay@example.com', pass: 'decrypted-smtp-password' },
        },
        {
          from: 'user@example.com',
          to: 'sender@example.com',
          subject: 'Re: Question importante - Absence',
          text: 'Je suis absent.',
          inReplyTo: 'msg-001',
          references: 'msg-001',
        }
      );

      // Un log doit être créé
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
        { from: 'a@example.com', messageId: 'msg-001', subject: 'Q1', date: new Date() },
        { from: 'b@example.com', messageId: 'msg-002', subject: 'Q2', date: new Date() },
        { from: 'c@example.com', messageId: 'msg-003', subject: 'Q3', date: new Date() },
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

  describe('Gestion des messages déjà traités (anti-doublon)', () => {
    test('ne doit pas répondre à un expéditeur déjà traité', async () => {
      const mockMessages = [
        { from: 'sender@example.com', messageId: 'msg-001', subject: 'Question', date: new Date() },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (ReplyLogModel.hasReplied as jest.Mock).mockResolvedValue(true);

      await processUserAutoReply(mockSubscription);

      expect(smtpService.sendReply).not.toHaveBeenCalled();
      expect(ReplyLogModel.create).not.toHaveBeenCalled();
    });

    test('doit répondre uniquement aux nouveaux expéditeurs', async () => {
      const mockMessages = [
        { from: 'old@example.com', messageId: 'msg-001', subject: 'Q1', date: new Date() },
        { from: 'new@example.com', messageId: 'msg-002', subject: 'Q2', date: new Date() },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (ReplyLogModel.hasReplied as jest.Mock)
        .mockResolvedValueOnce(true)   // old@: déjà traité
        .mockResolvedValueOnce(false); // new@: non traité
      (smtpService.sendReply as jest.Mock).mockResolvedValue(undefined);

      await processUserAutoReply(mockSubscription);

      expect(smtpService.sendReply).toHaveBeenCalledTimes(1);
      expect(smtpService.sendReply).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ to: 'new@example.com' })
      );
      expect(ReplyLogModel.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Personnalisation du message', () => {
    test('doit utiliser le sujet personnalisé si fourni', async () => {
      const sub = { ...mockSubscription, custom_subject: 'Congés annuels' };
      const mockMessages = [
        { from: 'sender@example.com', messageId: 'msg-001', subject: 'Question', date: new Date() },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (smtpService.sendReply as jest.Mock).mockResolvedValue(undefined);

      await processUserAutoReply(sub);

      expect(smtpService.sendReply).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ subject: 'Re: Question - Congés annuels' })
      );
    });

    test('doit utiliser le message personnalisé si fourni', async () => {
      const sub = { ...mockSubscription, custom_message: 'Je suis en vacances. Retour le 5 février.' };
      const mockMessages = [
        { from: 'sender@example.com', messageId: 'msg-001', subject: 'Question', date: new Date() },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (smtpService.sendReply as jest.Mock).mockResolvedValue(undefined);

      await processUserAutoReply(sub);

      expect(smtpService.sendReply).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ text: 'Je suis en vacances. Retour le 5 février.' })
      );
    });

    test('doit utiliser le sujet et message par défaut si pas de personnalisation', async () => {
      const mockMessages = [
        { from: 'sender@example.com', messageId: 'msg-001', subject: 'Ma question', date: new Date() },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (smtpService.sendReply as jest.Mock).mockResolvedValue(undefined);

      await processUserAutoReply(mockSubscription);

      expect(smtpService.sendReply).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          subject: 'Re: Ma question - Absence',
          text: 'Je suis absent.',
        })
      );
    });

    test('doit gérer un sujet de message original absent', async () => {
      const mockMessages = [
        { from: 'sender@example.com', messageId: 'msg-001', subject: undefined, date: new Date() },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (smtpService.sendReply as jest.Mock).mockResolvedValue(undefined);

      await processUserAutoReply(mockSubscription);

      expect(smtpService.sendReply).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ subject: 'Re: (sans objet) - Absence' })
      );
    });
  });

  describe('Remplacement des variables de template', () => {
    test('doit remplacer {{raison}} dans le message', async () => {
      const sub = {
        ...mockSubscription,
        default_message: 'Absent pour {{raison}}.',
        reason: 'formation professionnelle',
      };
      const mockMessages = [
        { from: 'sender@example.com', messageId: 'msg-001', subject: 'Q', date: new Date() },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (smtpService.sendReply as jest.Mock).mockResolvedValue(undefined);

      await processUserAutoReply(sub);

      expect(smtpService.sendReply).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ text: 'Absent pour formation professionnelle.' })
      );
    });

    test('doit remplacer {{periode}} dans le message', async () => {
      const sub = {
        ...mockSubscription,
        default_message: 'Absent pendant la période {{periode}}.',
        closure_name: 'Vacances de Noël',
      };
      const mockMessages = [
        { from: 'sender@example.com', messageId: 'msg-001', subject: 'Q', date: new Date() },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (smtpService.sendReply as jest.Mock).mockResolvedValue(undefined);

      await processUserAutoReply(sub);

      expect(smtpService.sendReply).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ text: 'Absent pendant la période Vacances de Noël.' })
      );
    });

    test('doit remplacer {{raison}} par une chaîne vide si reason est null', async () => {
      const sub = {
        ...mockSubscription,
        default_message: 'Absent pour {{raison}}.',
        reason: null,
      };
      const mockMessages = [
        { from: 'sender@example.com', messageId: 'msg-001', subject: 'Q', date: new Date() },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (smtpService.sendReply as jest.Mock).mockResolvedValue(undefined);

      await processUserAutoReply(sub);

      expect(smtpService.sendReply).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ text: 'Absent pour .' })
      );
    });
  });

  describe('Gestion des erreurs', () => {
    test('doit continuer le traitement si l\'envoi d\'un message échoue', async () => {
      const mockMessages = [
        { from: 'a@example.com', messageId: 'msg-001', subject: 'Q1', date: new Date() },
        { from: 'b@example.com', messageId: 'msg-002', subject: 'Q2', date: new Date() },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (smtpService.sendReply as jest.Mock)
        .mockRejectedValueOnce(new Error('SMTP error'))
        .mockResolvedValueOnce(undefined);

      await processUserAutoReply(mockSubscription);

      expect(smtpService.sendReply).toHaveBeenCalledTimes(2);
      // Seul le second message crée un log
      expect(ReplyLogModel.create).toHaveBeenCalledTimes(1);
      expect(ReplyLogModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ original_from: 'b@example.com' })
      );
    });

    test('ne doit pas créer de log si l\'envoi échoue', async () => {
      const mockMessages = [
        { from: 'sender@example.com', messageId: 'msg-001', subject: 'Q', date: new Date() },
      ];

      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue(mockMessages);
      (smtpService.sendReply as jest.Mock).mockRejectedValue(new Error('SMTP error'));

      await processUserAutoReply(mockSubscription);

      expect(ReplyLogModel.create).not.toHaveBeenCalled();
    });

    test('ne doit pas lever d\'exception si fetchUnseenMessages retourne un tableau vide', async () => {
      (imapService.fetchUnseenMessages as jest.Mock).mockResolvedValue([]);

      await expect(processUserAutoReply(mockSubscription)).resolves.toBeUndefined();
    });
  });
});
