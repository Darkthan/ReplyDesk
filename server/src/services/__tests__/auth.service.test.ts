import { authenticateAndGetToken, verifyToken } from '../auth.service';
import { UserModel } from '../../models/user.model';
import { ServerModel } from '../../models/server.model';
import * as imapService from '../imap.service';
import * as encryptionService from '../encryption.service';
import { extractDomain } from '../../utils/domainMatcher';
import jwt from 'jsonwebtoken';

// Mock des dépendances
jest.mock('../../models/user.model');
jest.mock('../../models/server.model');
jest.mock('../imap.service');
jest.mock('../encryption.service');
jest.mock('../../utils/domainMatcher');
jest.mock('jsonwebtoken');

describe('auth.service', () => {
  const mockServer = {
    id: 'server-1',
    domain: 'example.com',
    imap_host: 'imap.example.com',
    imap_port: 993,
    imap_secure: true,
    smtp_host: 'smtp.example.com',
    smtp_port: 465,
    smtp_secure: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const imapOk: imapService.ImapValidationResult = { ok: true };

  beforeEach(() => {
    jest.clearAllMocks();

    (extractDomain as jest.Mock).mockReturnValue('example.com');

    (encryptionService.encrypt as jest.Mock).mockReturnValue({
      enc: 'encrypted',
      iv: 'iv123',
      tag: 'tag123',
    });
  });

  describe('authenticateAndGetToken', () => {
    test('doit créer un nouvel utilisateur et retourner un token', async () => {
      const email = 'newuser@example.com';
      const password = 'password123';

      (ServerModel.findByDomain as jest.Mock).mockResolvedValue(mockServer);
      (imapService.validateImapCredentials as jest.Mock).mockResolvedValue(imapOk);
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserModel.create as jest.Mock).mockResolvedValue({
        id: 'user-new',
        email: email.toLowerCase(),
        role: 'user',
        mail_server_id: 'server-1',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

      const result = await authenticateAndGetToken(email, password);

      expect(extractDomain).toHaveBeenCalledWith(email);
      expect(ServerModel.findByDomain).toHaveBeenCalledWith('example.com');
      expect(imapService.validateImapCredentials).toHaveBeenCalledWith({
        host: mockServer.imap_host,
        port: mockServer.imap_port,
        secure: mockServer.imap_secure,
        auth: { user: email, pass: password },
      });
      expect(UserModel.create).toHaveBeenCalled();
      expect(result).toEqual({
        token: 'mock-jwt-token',
        user: {
          id: 'user-new',
          email: email.toLowerCase(),
          role: 'user',
        },
      });
    });

    test('doit authentifier un utilisateur existant et mettre à jour le mot de passe', async () => {
      const email = 'existinguser@example.com';
      const password = 'newpassword';

      const existingUser = {
        id: 'user-existing',
        email: email.toLowerCase(),
        role: 'user',
        mail_server_id: 'server-1',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (ServerModel.findByDomain as jest.Mock).mockResolvedValue(mockServer);
      (imapService.validateImapCredentials as jest.Mock).mockResolvedValue(imapOk);
      (UserModel.findByEmail as jest.Mock)
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(existingUser);
      (UserModel.updatePassword as jest.Mock).mockResolvedValue(undefined);
      (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

      const result = await authenticateAndGetToken(email, password);

      expect(UserModel.updatePassword).toHaveBeenCalledWith('user-existing', 'encrypted', 'iv123', 'tag123');
      expect(UserModel.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        token: 'mock-jwt-token',
        user: {
          id: 'user-existing',
          email: email.toLowerCase(),
          role: 'user',
        },
      });
    });

    test('doit créer un utilisateur avec le rôle user par défaut', async () => {
      const email = 'newuser@example.com';
      const password = 'password123';

      (ServerModel.findByDomain as jest.Mock).mockResolvedValue(mockServer);
      (imapService.validateImapCredentials as jest.Mock).mockResolvedValue(imapOk);
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserModel.create as jest.Mock).mockResolvedValue({
        id: 'user-new',
        email: email.toLowerCase(),
        role: 'user',
        mail_server_id: 'server-1',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

      const result = await authenticateAndGetToken(email, password);

      expect(UserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'user' })
      );
      if (!('error' in result)) {
        expect(result.user.role).toBe('user');
      }
    });

    test('doit retourner une erreur si le domaine n\'est pas configuré', async () => {
      (ServerModel.findByDomain as jest.Mock).mockResolvedValue(null);

      const result = await authenticateAndGetToken('user@unknowndomain.com', 'password');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.code).toBe('server_not_found');
      }
      expect(imapService.validateImapCredentials).not.toHaveBeenCalled();
    });

    test('doit retourner une erreur si les identifiants IMAP sont invalides', async () => {
      const imapFail: imapService.ImapValidationResult = {
        ok: false,
        reason: 'auth_failed',
        message: 'Identifiants incorrects',
      };
      (ServerModel.findByDomain as jest.Mock).mockResolvedValue(mockServer);
      (imapService.validateImapCredentials as jest.Mock).mockResolvedValue(imapFail);

      const result = await authenticateAndGetToken('user@example.com', 'wrongpassword');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.code).toBe('auth_failed');
      }
      expect(UserModel.findByEmail).not.toHaveBeenCalled();
    });

    test('doit retourner une erreur si le serveur est inaccessible', async () => {
      const imapFail: imapService.ImapValidationResult = {
        ok: false,
        reason: 'unreachable',
        message: 'Serveur IMAP inaccessible',
      };
      (ServerModel.findByDomain as jest.Mock).mockResolvedValue(mockServer);
      (imapService.validateImapCredentials as jest.Mock).mockResolvedValue(imapFail);

      const result = await authenticateAndGetToken('user@example.com', 'password');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.code).toBe('unreachable');
      }
    });

    test('doit gérer les emails avec des majuscules', async () => {
      const email = 'User@Example.COM';

      (ServerModel.findByDomain as jest.Mock).mockResolvedValue(mockServer);
      (imapService.validateImapCredentials as jest.Mock).mockResolvedValue(imapOk);
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserModel.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: email.toLowerCase(),
        role: 'user',
        mail_server_id: 'server-1',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

      await authenticateAndGetToken(email, 'password');

      expect(UserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: email.toLowerCase() })
      );
    });

    test('doit générer un token JWT avec les bonnes informations', async () => {
      const email = 'user@example.com';

      (ServerModel.findByDomain as jest.Mock).mockResolvedValue(mockServer);
      (imapService.validateImapCredentials as jest.Mock).mockResolvedValue(imapOk);
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserModel.create as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: email.toLowerCase(),
        role: 'user',
        mail_server_id: 'server-1',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

      await authenticateAndGetToken(email, 'password');

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: 'user-123',
          email: email.toLowerCase(),
          role: 'user',
        },
        expect.any(String),
        { expiresIn: '24h' }
      );
    });

    test('doit utiliser l\'ID de serveur explicite s\'il est fourni', async () => {
      const email = 'user@example.com';

      (ServerModel.findById as jest.Mock).mockResolvedValue(mockServer);
      (imapService.validateImapCredentials as jest.Mock).mockResolvedValue(imapOk);
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserModel.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: email.toLowerCase(),
        role: 'user',
        mail_server_id: 'server-1',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

      await authenticateAndGetToken(email, 'password', 'server-1');

      expect(ServerModel.findById).toHaveBeenCalledWith('server-1');
      expect(ServerModel.findByDomain).not.toHaveBeenCalled();
      expect(extractDomain).not.toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    test('doit vérifier un token valide', () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = verifyToken('valid-token');

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
      expect(result).toEqual(mockPayload);
    });

    test('doit retourner null pour un token invalide', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = verifyToken('invalid-token');

      expect(result).toBeNull();
    });

    test('doit retourner null pour un token expiré', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Token expired');
      });

      const result = verifyToken('expired-token');

      expect(result).toBeNull();
    });

    test('doit retourner null pour un token malformé', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Malformed token');
      });

      const result = verifyToken('malformed-token');

      expect(result).toBeNull();
    });
  });
});
