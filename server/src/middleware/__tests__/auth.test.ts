import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../auth';
import * as authService from '../../services/auth.service';

// Mock du service d'authentification
jest.mock('../../services/auth.service');

describe('Middleware auth', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  test('doit autoriser une requête avec un token valide', () => {
    const mockPayload = {
      userId: 'user-123',
      email: 'user@example.com',
      role: 'user',
    };

    mockRequest.headers = {
      authorization: 'Bearer valid-token',
    };

    (authService.verifyToken as jest.Mock).mockReturnValue(mockPayload);

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(authService.verifyToken).toHaveBeenCalledWith('valid-token');
    expect(mockRequest.user).toEqual(mockPayload);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  test('doit rejeter une requête sans header Authorization', () => {
    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token manquant' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('doit rejeter une requête avec un format de token invalide', () => {
    mockRequest.headers = {
      authorization: 'InvalidFormat token',
    };

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token manquant' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('doit rejeter une requête avec uniquement "Bearer"', () => {
    mockRequest.headers = {
      authorization: 'Bearer',
    };

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token manquant' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('doit rejeter une requête avec un token invalide', () => {
    mockRequest.headers = {
      authorization: 'Bearer invalid-token',
    };

    (authService.verifyToken as jest.Mock).mockReturnValue(null);

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(authService.verifyToken).toHaveBeenCalledWith('invalid-token');
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token invalide ou expiré' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('doit rejeter une requête avec un token expiré', () => {
    mockRequest.headers = {
      authorization: 'Bearer expired-token',
    };

    (authService.verifyToken as jest.Mock).mockReturnValue(null);

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token invalide ou expiré' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('doit extraire le token même avec des espaces dans la valeur', () => {
    const mockPayload = {
      userId: 'user-123',
      email: 'user@example.com',
      role: 'user',
    };

    mockRequest.headers = {
      authorization: 'Bearer valid-token-with-content',
    };

    (authService.verifyToken as jest.Mock).mockReturnValue(mockPayload);

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(authService.verifyToken).toHaveBeenCalledWith('valid-token-with-content');
    expect(nextFunction).toHaveBeenCalled();
  });

  test('doit rejeter si Bearer est en minuscules', () => {
    mockRequest.headers = {
      authorization: 'bearer valid-token',
    };

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Le middleware vérifie strictement 'Bearer ' (avec majuscule)
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token manquant' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('doit attacher les informations utilisateur à la requête', () => {
    const mockPayload = {
      userId: 'user-456',
      email: 'admin@example.com',
      role: 'admin',
    };

    mockRequest.headers = {
      authorization: 'Bearer admin-token',
    };

    (authService.verifyToken as jest.Mock).mockReturnValue(mockPayload);

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.user).toEqual({
      userId: 'user-456',
      email: 'admin@example.com',
      role: 'admin',
    });
  });
});
