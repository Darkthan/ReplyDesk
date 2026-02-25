import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../validate';

describe('Middleware validate', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  test('doit valider un body correct', () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });

    mockRequest.body = {
      email: 'user@example.com',
      password: 'password123',
    };

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  test('doit rejeter un body invalide', () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });

    mockRequest.body = {
      email: 'invalid-email',
      password: '123', // Trop court
    };

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Données invalides',
      details: expect.any(Array),
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('doit retourner les détails des erreurs de validation', () => {
    const schema = z.object({
      email: z.string().email('Email invalide'),
      password: z.string().min(6, 'Mot de passe trop court'),
    });

    mockRequest.body = {
      email: 'not-an-email',
      password: '123',
    };

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Données invalides',
      details: expect.arrayContaining([
        expect.objectContaining({
          path: 'email',
          message: 'Email invalide',
        }),
        expect.objectContaining({
          path: 'password',
          message: 'Mot de passe trop court',
        }),
      ]),
    });
  });

  test('doit valider un champ manquant requis', () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string(),
    });

    mockRequest.body = {
      email: 'user@example.com',
      // password manquant
    };

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Données invalides',
      })
    );
  });

  test('doit valider un champ optionnel absent', () => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().optional(),
    });

    mockRequest.body = {
      email: 'user@example.com',
      // name est optionnel
    };

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  test('doit transformer les données selon le schéma', () => {
    const schema = z.object({
      email: z.string().email().toLowerCase(),
      age: z.string().transform(Number),
    });

    mockRequest.body = {
      email: 'USER@EXAMPLE.COM',
      age: '25',
    };

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.body.email).toBe('user@example.com');
    expect(mockRequest.body.age).toBe(25);
    expect(nextFunction).toHaveBeenCalled();
  });

  test('doit valider des types complexes', () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
      tags: z.array(z.string()),
    });

    mockRequest.body = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
      },
      tags: ['tag1', 'tag2'],
    };

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
  });

  test('doit rejeter des types complexes invalides', () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
      tags: z.array(z.string()),
    });

    mockRequest.body = {
      user: {
        name: 'John Doe',
        email: 'invalid-email',
      },
      tags: 'not-an-array',
    };

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('doit formater correctement le path des erreurs imbriquées', () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          email: z.string().email(),
        }),
      }),
    });

    mockRequest.body = {
      user: {
        profile: {
          email: 'invalid',
        },
      },
    };

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Données invalides',
      details: expect.arrayContaining([
        expect.objectContaining({
          path: 'user.profile.email',
        }),
      ]),
    });
  });

  test('doit supprimer les champs non définis dans le schéma (strict)', () => {
    const schema = z.object({
      email: z.string().email(),
    }).strict();

    mockRequest.body = {
      email: 'user@example.com',
      extraField: 'should be removed',
    };

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Avec .strict(), les champs supplémentaires causent une erreur
    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });

  test('doit accepter les champs supplémentaires sans strict', () => {
    const schema = z.object({
      email: z.string().email(),
    });

    mockRequest.body = {
      email: 'user@example.com',
      extraField: 'allowed',
    };

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
  });

  test('doit gérer les erreurs non-Zod', () => {
    const schema = z.object({
      email: z.string(),
    });

    // Simuler une erreur non-Zod lors du parsing
    jest.spyOn(schema, 'parse').mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    mockRequest.body = {
      email: 'test@example.com',
    };

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Les erreurs non-Zod sont passées à next()
    expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
  });

  test('doit valider des contraintes personnalisées', () => {
    const schema = z.object({
      password: z.string().refine(
        (val) => /[A-Z]/.test(val) && /[0-9]/.test(val),
        'Le mot de passe doit contenir au moins une majuscule et un chiffre'
      ),
    });

    mockRequest.body = {
      password: 'weakpassword',
    };

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Données invalides',
      details: expect.arrayContaining([
        expect.objectContaining({
          message: 'Le mot de passe doit contenir au moins une majuscule et un chiffre',
        }),
      ]),
    });
  });

  test('doit valider plusieurs erreurs simultanément', () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      age: z.number().positive(),
    });

    mockRequest.body = {
      email: 'invalid',
      password: '123',
      age: -5,
    };

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
    expect(callArgs.details).toHaveLength(3);
  });
});
