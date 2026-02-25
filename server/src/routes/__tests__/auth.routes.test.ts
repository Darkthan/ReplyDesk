import request from 'supertest';
import app from '../../app';
import * as authService from '../../services/auth.service';
import { UserModel } from '../../models/user.model';

// Mock des dépendances
jest.mock('../../services/auth.service');
jest.mock('../../models/user.model');

// Le contrôleur utilise loginAttempts.service pour le rate-limiting applicatif
jest.mock('../../services/loginAttempts.service', () => ({
  checkAccess:   jest.fn().mockResolvedValue({ allowed: true }),
  recordFailure: jest.fn().mockResolvedValue({ remaining: 4, locked: false }),
  recordSuccess: jest.fn().mockResolvedValue(undefined),
}));

const mockUser = { id: 'user-123', email: 'user@example.com', role: 'user' };
const mockAuthSuccess = { token: 'mock-jwt-token', user: mockUser };
const mockAuthError = {
  error: { code: 'auth_failed', message: 'Identifiants incorrects (email ou mot de passe IMAP)' },
};

describe('Routes Auth - /api/auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Réinitialiser checkAccess à "autorisé" par défaut après clearAllMocks
    const loginAttempts = require('../../services/loginAttempts.service');
    loginAttempts.checkAccess.mockResolvedValue({ allowed: true });
    loginAttempts.recordFailure.mockResolvedValue({ remaining: 4, locked: false });
    loginAttempts.recordSuccess.mockResolvedValue(undefined);
  });

  describe('POST /api/auth/login', () => {
    test('doit retourner 200 et les infos utilisateur avec des identifiants corrects', async () => {
      (authService.authenticateAndGetToken as jest.Mock).mockResolvedValue(mockAuthSuccess);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', imapPassword: 'password123' });

      expect(response.status).toBe(200);
      // Le token est dans un cookie httpOnly, le body contient seulement { user }
      expect(response.body).toEqual({ user: mockUser });
      expect(response.headers['set-cookie']).toBeDefined();
      expect(authService.authenticateAndGetToken).toHaveBeenCalledWith(
        'user@example.com', 'password123', undefined
      );
    });

    test('doit retourner 401 avec des identifiants invalides', async () => {
      (authService.authenticateAndGetToken as jest.Mock).mockResolvedValue(mockAuthError);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', imapPassword: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('doit retourner 400 avec un email invalide', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email', imapPassword: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('doit retourner 400 sans email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ imapPassword: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('doit retourner 400 sans mot de passe', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('doit retourner 400 avec un mot de passe vide', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', imapPassword: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('doit gérer les emails avec des majuscules', async () => {
      const userUpperCase = { id: 'user-123', email: 'User@Example.COM', role: 'user' };
      (authService.authenticateAndGetToken as jest.Mock).mockResolvedValue({
        token: 'mock-jwt-token',
        user: userUpperCase,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'User@Example.COM', imapPassword: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: userUpperCase });
    });

    test('doit retourner 429 si le compte est verrouillé', async () => {
      const loginAttempts = require('../../services/loginAttempts.service');
      loginAttempts.checkAccess.mockResolvedValue({ allowed: false, reason: 'Compte verrouillé' });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', imapPassword: 'password123' });

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/register', () => {
    test('doit créer un nouvel utilisateur avec succès (201)', async () => {
      const newUser = { id: 'user-456', email: 'newuser@example.com', role: 'user' };
      (authService.authenticateAndGetToken as jest.Mock).mockResolvedValue({
        token: 'mock-jwt-token',
        user: newUser,
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'newuser@example.com', imapPassword: 'password123' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ user: newUser });
      expect(authService.authenticateAndGetToken).toHaveBeenCalledWith(
        'newuser@example.com', 'password123', undefined
      );
    });

    test('doit retourner 401 si le serveur mail n\'est pas configuré', async () => {
      (authService.authenticateAndGetToken as jest.Mock).mockResolvedValue({
        error: { code: 'server_not_found', message: 'Aucun serveur mail configuré pour ce domaine' },
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user@unknowndomain.com', imapPassword: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('doit retourner 400 avec un email invalide', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', imapPassword: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    test('doit retourner les informations de l\'utilisateur authentifié', async () => {
      const mockUserFull = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
        mail_server_id: 'server-1',
        is_active: true,
        created_at: new Date('2024-01-01'),
        imap_password_enc: 'enc',
        imap_password_iv: 'iv',
        imap_password_tag: 'tag',
        updated_at: new Date('2024-01-01'),
      };

      (UserModel.findByEmail as jest.Mock).mockResolvedValue(mockUserFull);

      const mockVerify = jest.spyOn(authService, 'verifyToken').mockReturnValue({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: mockUserFull.id,
        email: mockUserFull.email,
        role: mockUserFull.role,
        mail_server_id: mockUserFull.mail_server_id,
        is_active: mockUserFull.is_active,
        created_at: mockUserFull.created_at.toISOString(),
      });

      mockVerify.mockRestore();
    });

    test('doit retourner 401 sans token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('doit retourner 401 avec un token invalide', async () => {
      const mockVerify = jest.spyOn(authService, 'verifyToken').mockReturnValue(null);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');

      mockVerify.mockRestore();
    });

    test('doit retourner 401 avec un format de token invalide', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('doit retourner 404 si l\'utilisateur n\'existe pas', async () => {
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);

      const mockVerify = jest.spyOn(authService, 'verifyToken').mockReturnValue({
        userId: 'user-123',
        email: 'nonexistent@example.com',
        role: 'user',
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Utilisateur non trouvé' });

      mockVerify.mockRestore();
    });
  });

  describe('Rate limiting', () => {
    test('doit appliquer le rate limiting sur les routes auth', async () => {
      (authService.authenticateAndGetToken as jest.Mock).mockResolvedValue(mockAuthSuccess);

      const requests = [];
      for (let i = 0; i < 25; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com', imapPassword: 'pass' })
        );
      }

      const responses = await Promise.all(requests);

      // Au moins une requête doit être bloquée (429) par express-rate-limit
      const blockedRequests = responses.filter((r) => r.status === 429);
      expect(blockedRequests.length).toBeGreaterThan(0);
    });
  });
});
