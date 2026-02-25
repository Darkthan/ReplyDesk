# Tests pour EmailAuto

Ce dossier contient tous les tests unitaires et d'intégration pour l'application EmailAuto.

## Structure des tests

```
src/
├── __tests__/
│   ├── setup.ts                    # Configuration globale des tests
│   └── README.md                   # Ce fichier
├── utils/__tests__/
│   └── domainMatcher.test.ts       # Tests pour l'extraction de domaine
├── services/__tests__/
│   ├── encryption.service.test.ts  # Tests pour le chiffrement
│   ├── autoreply.service.test.ts   # Tests pour le service d'autoréponse
│   ├── auth.service.test.ts        # Tests pour l'authentification
│   ├── imap.service.test.ts        # Tests pour le service IMAP
│   └── smtp.service.test.ts        # Tests pour le service SMTP
├── middleware/__tests__/
│   ├── auth.test.ts                # Tests pour le middleware d'auth
│   └── adminOnly.test.ts           # Tests pour le middleware admin
└── routes/__tests__/
    └── auth.routes.test.ts         # Tests d'intégration des routes auth
```

## Exécution des tests

### Prérequis

Assurez-vous d'avoir installé toutes les dépendances :

```bash
npm install
```

### Commandes disponibles

```bash
# Exécuter tous les tests
npm test

# Exécuter les tests en mode watch (rechargement automatique)
npm run test:watch

# Exécuter les tests avec la couverture de code
npm run test:coverage
```

### Variables d'environnement pour les tests

Les tests utilisent des variables d'environnement de test définies dans `setup.ts`. Vous pouvez également créer un fichier `.env.test` à la racine du dossier `server/` :

```env
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key-for-testing-only
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
DATABASE_URL=postgresql://test:test@localhost:5432/emailauto_test
PORT=3001
ADMIN_EMAIL=admin@test.com
```

## Types de tests

### Tests unitaires

Les tests unitaires testent des fonctions ou des modules isolés en mockant leurs dépendances :

- **domainMatcher.test.ts** : Teste l'extraction de domaine depuis un email
- **encryption.service.test.ts** : Teste le chiffrement et déchiffrement
- **auth.service.test.ts** : Teste la logique d'authentification
- **imap.service.test.ts** : Teste la validation IMAP et la récupération de messages
- **smtp.service.test.ts** : Teste l'envoi d'emails

### Tests d'intégration

Les tests d'intégration testent plusieurs composants ensemble :

- **auth.routes.test.ts** : Teste les endpoints d'authentification avec supertest
- **autoreply.service.test.ts** : Teste le flux complet d'autoréponse

### Tests de middleware

Les tests de middleware testent les fonctions intermédiaires Express :

- **auth.test.ts** : Teste la vérification du JWT
- **adminOnly.test.ts** : Teste la restriction d'accès admin

## Bonnes pratiques

1. **Isolation** : Chaque test doit être indépendant et ne pas dépendre de l'ordre d'exécution
2. **Mocking** : Utiliser des mocks pour les dépendances externes (base de données, IMAP, SMTP)
3. **Nettoyage** : Utiliser `beforeEach` et `afterEach` pour nettoyer les mocks
4. **Clarté** : Donner des noms descriptifs aux tests (utiliser "doit..." en français)
5. **Coverage** : Viser au moins 80% de couverture de code

## Ajouter de nouveaux tests

Pour ajouter de nouveaux tests :

1. Créer un dossier `__tests__` à côté du fichier à tester
2. Créer un fichier `nomDuFichier.test.ts`
3. Suivre la structure :

```typescript
import { functionToTest } from '../functionToTest';

describe('Description du module', () => {
  beforeEach(() => {
    // Configuration avant chaque test
  });

  describe('Description de la fonction', () => {
    test('doit faire quelque chose', () => {
      // Arrange (préparation)
      const input = 'test';

      // Act (action)
      const result = functionToTest(input);

      // Assert (vérification)
      expect(result).toBe('expected');
    });
  });
});
```

## Résolution des problèmes

### Les tests échouent avec des erreurs de timeout

Augmentez le timeout dans `jest.config.js` :

```javascript
testTimeout: 20000, // 20 secondes
```

### Les mocks ne fonctionnent pas

Vérifiez que les mocks sont bien définis avant les imports :

```typescript
jest.mock('../module');
import { function } from '../module';
```

### Erreurs de variables d'environnement

Assurez-vous que le fichier `setup.ts` est bien exécuté et que toutes les variables nécessaires sont définies.

## Ressources

- [Documentation Jest](https://jestjs.io/)
- [Documentation Supertest](https://github.com/visionmedia/supertest)
- [Documentation ts-jest](https://kulshekhar.github.io/ts-jest/)
