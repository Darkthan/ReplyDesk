import { extractDomain } from '../domainMatcher';

describe('domainMatcher - extractDomain', () => {
  describe('Cas valides', () => {
    test('doit extraire correctement le domaine d\'un email simple', () => {
      const result = extractDomain('user@example.com');
      expect(result).toBe('example.com');
    });

    test('doit extraire le domaine d\'un email avec sous-domaine', () => {
      const result = extractDomain('admin@mail.example.com');
      expect(result).toBe('mail.example.com');
    });

    test('doit convertir le domaine en minuscules', () => {
      const result = extractDomain('User@EXAMPLE.COM');
      expect(result).toBe('example.com');
    });

    test('doit gérer les domaines avec tirets et chiffres', () => {
      const result = extractDomain('contact@test-123.example.org');
      expect(result).toBe('test-123.example.org');
    });

    test('doit gérer les TLD courts', () => {
      const result = extractDomain('info@site.io');
      expect(result).toBe('site.io');
    });

    test('doit gérer les TLD longs', () => {
      const result = extractDomain('admin@company.technology');
      expect(result).toBe('company.technology');
    });

    test('doit gérer les emails avec des points dans la partie locale', () => {
      const result = extractDomain('first.last@domain.com');
      expect(result).toBe('domain.com');
    });

    test('doit gérer les emails avec des tirets dans la partie locale', () => {
      const result = extractDomain('first-last@domain.com');
      expect(result).toBe('domain.com');
    });

    test('doit gérer les emails avec des chiffres dans la partie locale', () => {
      const result = extractDomain('user123@domain.com');
      expect(result).toBe('domain.com');
    });
  });

  describe('Cas invalides', () => {
    test('doit lever une erreur pour un email sans @', () => {
      expect(() => extractDomain('invalidemail.com')).toThrow('Invalid email format');
    });

    test('doit lever une erreur pour un email avec plusieurs @', () => {
      expect(() => extractDomain('user@@example.com')).toThrow('Invalid email format');
    });

    test('doit lever une erreur pour un email vide', () => {
      expect(() => extractDomain('')).toThrow('Invalid email format');
    });

    test('doit retourner une chaîne vide pour uniquement @', () => {
      // Note: La fonction extractDomain split sur @ mais ne valide pas si les parties sont vides
      const result = extractDomain('@');
      expect(result).toBe('');
    });

    test('doit extraire le domaine même si la partie locale est vide', () => {
      // Note: La validation stricte devrait être faite en amont
      const result = extractDomain('@example.com');
      expect(result).toBe('example.com');
    });

    test('doit retourner une chaîne vide si le domaine est absent', () => {
      // Note: La validation stricte devrait être faite en amont
      const result = extractDomain('user@');
      expect(result).toBe('');
    });
  });

  describe('Cas limites', () => {
    test('doit gérer un email avec domaine d\'un seul caractère (théorique)', () => {
      const result = extractDomain('user@a.b');
      expect(result).toBe('a.b');
    });

    test('doit gérer les espaces (même si invalide en pratique)', () => {
      // Note: Dans une vraie application, cela devrait être validé en amont
      const result = extractDomain('user @example.com');
      expect(result).toBe('example.com');
    });
  });
});
