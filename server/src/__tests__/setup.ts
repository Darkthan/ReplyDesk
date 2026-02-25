// Configuration globale pour les tests
import { config } from 'dotenv';

// Charger les variables d'environnement de test
config({ path: '.env.test' });

// Définir les variables d'environnement par défaut pour les tests si elles n'existent pas
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/emailauto_test';
process.env.PORT = process.env.PORT || '3001';

// Mock du logger pour éviter les logs pendant les tests
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));
