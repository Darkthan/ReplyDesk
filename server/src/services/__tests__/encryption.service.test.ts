import { encrypt, decrypt } from '../encryption.service';

describe('encryption.service', () => {
  describe('encrypt', () => {
    test('doit chiffrer un texte simple', () => {
      const plainText = 'mon mot de passe secret';
      const result = encrypt(plainText);

      expect(result).toHaveProperty('enc');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('tag');
      expect(result.enc).toBeTruthy();
      expect(result.iv).toBeTruthy();
      expect(result.tag).toBeTruthy();
      expect(result.enc).not.toBe(plainText);
    });

    test('doit générer des IV différents pour le même texte', () => {
      const plainText = 'test123';
      const result1 = encrypt(plainText);
      const result2 = encrypt(plainText);

      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.enc).not.toBe(result2.enc);
      expect(result1.tag).not.toBe(result2.tag);
    });

    test('doit chiffrer une chaîne vide', () => {
      const plainText = '';
      const result = encrypt(plainText);

      expect(result).toHaveProperty('enc');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('tag');
    });

    test('doit chiffrer des caractères spéciaux', () => {
      const plainText = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?';
      const result = encrypt(plainText);

      expect(result.enc).toBeTruthy();
      expect(result.iv).toBeTruthy();
      expect(result.tag).toBeTruthy();
    });

    test('doit chiffrer des caractères Unicode', () => {
      const plainText = 'Héllo Wörld 你好 мир';
      const result = encrypt(plainText);

      expect(result.enc).toBeTruthy();
      expect(result.iv).toBeTruthy();
      expect(result.tag).toBeTruthy();
    });

    test('doit chiffrer un texte long', () => {
      const plainText = 'a'.repeat(10000);
      const result = encrypt(plainText);

      expect(result.enc).toBeTruthy();
      expect(result.iv).toBeTruthy();
      expect(result.tag).toBeTruthy();
    });
  });

  describe('decrypt', () => {
    test('doit déchiffrer correctement un texte chiffré', () => {
      const plainText = 'mon mot de passe secret';
      const encrypted = encrypt(plainText);
      const decrypted = decrypt(encrypted.enc, encrypted.iv, encrypted.tag);

      expect(decrypted).toBe(plainText);
    });

    test('doit déchiffrer une chaîne vide', () => {
      const plainText = '';
      const encrypted = encrypt(plainText);
      const decrypted = decrypt(encrypted.enc, encrypted.iv, encrypted.tag);

      expect(decrypted).toBe(plainText);
    });

    test('doit déchiffrer des caractères spéciaux', () => {
      const plainText = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encrypt(plainText);
      const decrypted = decrypt(encrypted.enc, encrypted.iv, encrypted.tag);

      expect(decrypted).toBe(plainText);
    });

    test('doit déchiffrer des caractères Unicode', () => {
      const plainText = 'Héllo Wörld 你好 мир';
      const encrypted = encrypt(plainText);
      const decrypted = decrypt(encrypted.enc, encrypted.iv, encrypted.tag);

      expect(decrypted).toBe(plainText);
    });

    test('doit déchiffrer un texte long', () => {
      const plainText = 'a'.repeat(10000);
      const encrypted = encrypt(plainText);
      const decrypted = decrypt(encrypted.enc, encrypted.iv, encrypted.tag);

      expect(decrypted).toBe(plainText);
    });

    test('doit lever une erreur avec un tag invalide', () => {
      const plainText = 'test';
      const encrypted = encrypt(plainText);
      const wrongTag = '0'.repeat(32);

      expect(() => decrypt(encrypted.enc, encrypted.iv, wrongTag)).toThrow();
    });

    test('doit lever une erreur avec un IV invalide', () => {
      const plainText = 'test';
      const encrypted = encrypt(plainText);
      const wrongIv = '0'.repeat(32);

      expect(() => decrypt(encrypted.enc, wrongIv, encrypted.tag)).toThrow();
    });

    test('doit lever une erreur avec des données chiffrées invalides', () => {
      const plainText = 'test';
      const encrypted = encrypt(plainText);
      const wrongEnc = '0'.repeat(encrypted.enc.length);

      expect(() => decrypt(wrongEnc, encrypted.iv, encrypted.tag)).toThrow();
    });

    test('doit lever une erreur si le tag a été modifié', () => {
      const plainText = 'test';
      const encrypted = encrypt(plainText);
      // Modifier le dernier octet du tag par XOR pour garantir un changement
      const lastByte = encrypted.tag.slice(-2);
      const flippedByte = (parseInt(lastByte, 16) ^ 0xff).toString(16).padStart(2, '0');
      const tamperedTag = encrypted.tag.slice(0, -2) + flippedByte;

      expect(() => decrypt(encrypted.enc, encrypted.iv, tamperedTag)).toThrow();
    });

    test('doit lever une erreur si les données ont été modifiées', () => {
      const plainText = 'test';
      const encrypted = encrypt(plainText);
      // XOR le dernier octet avec 0xff pour garantir un changement quelle que soit la valeur d'origine
      const lastByte = encrypted.enc.slice(-2);
      const flippedByte = (parseInt(lastByte, 16) ^ 0xff).toString(16).padStart(2, '0');
      const tamperedEnc = encrypted.enc.slice(0, -2) + flippedByte;

      expect(() => decrypt(tamperedEnc, encrypted.iv, encrypted.tag)).toThrow();
    });
  });

  describe('Intégration encrypt/decrypt', () => {
    test('doit chiffrer et déchiffrer plusieurs fois le même texte', () => {
      const plainText = 'test multiples fois';

      for (let i = 0; i < 10; i++) {
        const encrypted = encrypt(plainText);
        const decrypted = decrypt(encrypted.enc, encrypted.iv, encrypted.tag);
        expect(decrypted).toBe(plainText);
      }
    });

    test('doit traiter correctement différents types de textes', () => {
      const testCases = [
        'simple text',
        '',
        '123456789',
        'éèêë àâä îï ùû',
        '你好世界',
        'P@$$w0rd!',
        'a'.repeat(1000),
        '\n\t\r',
        'line1\nline2\nline3',
      ];

      testCases.forEach((testCase) => {
        const encrypted = encrypt(testCase);
        const decrypted = decrypt(encrypted.enc, encrypted.iv, encrypted.tag);
        expect(decrypted).toBe(testCase);
      });
    });
  });
});
