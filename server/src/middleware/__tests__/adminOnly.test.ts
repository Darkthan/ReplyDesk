import { Request, Response, NextFunction } from 'express';
import { adminOnly } from '../adminOnly';

describe('Middleware adminOnly', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  test('doit autoriser un utilisateur admin', () => {
    mockRequest.user = {
      userId: 'admin-123',
      email: 'admin@example.com',
      role: 'admin',
    };

    adminOnly(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  test('doit bloquer un utilisateur non-admin', () => {
    mockRequest.user = {
      userId: 'user-123',
      email: 'user@example.com',
      role: 'user',
    };

    adminOnly(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Accès réservé aux administrateurs',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('doit bloquer une requête sans utilisateur', () => {
    mockRequest.user = undefined;

    adminOnly(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Accès réservé aux administrateurs',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('doit bloquer une requête avec un rôle invalide', () => {
    mockRequest.user = {
      userId: 'user-123',
      email: 'user@example.com',
      role: 'invalid-role' as any,
    };

    adminOnly(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('doit bloquer une requête avec un rôle null', () => {
    mockRequest.user = {
      userId: 'user-123',
      email: 'user@example.com',
      role: null as any,
    };

    adminOnly(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('doit bloquer une requête avec un user partiel', () => {
    mockRequest.user = {
      userId: 'user-123',
      email: 'user@example.com',
    } as any;

    adminOnly(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
