import request from 'supertest';
import app from '../../app';
import * as authService from '../../services/auth.service';
import { UserModel } from '../../models/user.model';

// Mock des dépendances
jest.mock('../../services/auth.service');
jest.mock('../../models/user.model');

describe('Routes Auth - /api/auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    test('doit retourner un token valide avec des identifiants corrects', async () => {
      const mockAuthResult = {
        token: 'mock-jwt-token',
        user: {
          id: 'user-123',
          email: 'user@example.com',
          role: 'user',
        },
      };

      (authService.authenticateAndGetToken as jest.Mock).mockResolvedValue(mockAuthResult);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          imapPassword: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAuthResult);
      expect(authService.authenticateAndGetToken).toHaveBeenCalledWith('user@example.com', 'password123');
    });

    test('doit retourner 401 avec des identifiants invalides', async () => {
      (authService.authenticateAndGetToken as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          imapPassword: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Identifiants invalides ou serveur mail non configuré',
      });
    });

    test('doit retourner 400 avec un email invalide', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          imapPassword: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('doit retourner 400 sans email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          imapPassword: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('doit retourner 400 sans mot de passe', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('doit retourner 400 avec un mot de passe vide', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          imapPassword: '',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('doit gérer les emails avec des majuscules', async () => {
      const mockAuthResult = {
        token: 'mock-jwt-token',
        user: {
          id: 'user-123',
          email: 'User@Example.COM',
          role: 'user',
        },
      };

      (authService.authenticateAndGetToken as jest.Mock).mockResolvedValue(mockAuthResult);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'User@Example.COM',
          imapPassword: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAuthResult);
    });
  });

  describe('POST /api/auth/register', () => {
    test('doit créer un nouvel utilisateur avec succès', async () => {
      const mockAuthResult = {
        token: 'mock-jwt-token',
        user: {
          id: 'user-456',
          email: 'newuser@example.com',
          role: 'user',
        },
      };

      (authService.authenticateAndGetToken as jest.Mock).mockResolvedValue(mockAuthResult);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          imapPassword: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockAuthResult);
      expect(authService.authenticateAndGetToken).toHaveBeenCalledWith('newuser@example.com', 'password123');
    });

    test('doit retourner 401 si le serveur mail n\'est pas configuré', async () => {
      (authService.authenticateAndGetToken as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@unknowndomain.com',
          imapPassword: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Identifiants invalides ou serveur mail non configuré',
      });
    });

    test('doit retourner 400 avec un email invalide', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          imapPassword: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    test('doit retourner les informations de l\'utilisateur authentifié', async () => {
      const mockUser = {
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

      (UserModel.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      // Mock d'un token valide
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
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        mail_server_id: mockUser.mail_server_id,
        is_active: mockUser.is_active,
        created_at: mockUser.created_at.toISOString(),
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
      (authService.authenticateAndGetToken as jest.Mock).mockResolvedValue({
        token: 'token',
        user: { id: '1', email: 'test@test.com', role: 'user' },
      });

      // Faire plusieurs requêtes rapides
      const requests = [];
      for (let i = 0; i < 25; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com', imapPassword: 'pass' })
        );
      }

      const responses = await Promise.all(requests);

      // Au moins une requête devrait être bloquée (status 429)
      const blockedRequests = responses.filter((r) => r.status === 429);
      expect(blockedRequests.length).toBeGreaterThan(0);
    });
  });
});
