# Documentation des Tests - EmailAuto

## 📋 Vue d'ensemble

Ce document décrit la suite de tests complète créée pour l'application EmailAuto. Les tests couvrent l'ensemble des fonctionnalités du backend, incluant les services, les contrôleurs, les middlewares et les routes.

## 🎯 Objectifs

- ✅ Garantir la qualité et la fiabilité du code
- ✅ Faciliter la maintenance et les refactorisations
- ✅ Documenter le comportement attendu des composants
- ✅ Détecter les régressions rapidement
- ✅ Améliorer la confiance dans les déploiements

## 📊 Statistiques

### Tests créés

- **Tests unitaires** : 12 fichiers
- **Tests d'intégration** : 1 fichier
- **Total de tests** : ~150+ cas de test

### Couverture

Les tests couvrent :
- ✅ Services (encryption, auth, autoreply, imap, smtp)
- ✅ Middlewares (auth, adminOnly, validate)
- ✅ Utilitaires (domainMatcher)
- ✅ Routes (auth)

## 🗂️ Structure des tests

```
server/
├── src/
│   ├── __tests__/
│   │   ├── setup.ts                        # Configuration globale
│   │   └── README.md                       # Documentation des tests
│   ├── utils/__tests__/
│   │   └── domainMatcher.test.ts           # 12 tests
│   ├── services/__tests__/
│   │   ├── encryption.service.test.ts      # 31 tests
│   │   ├── autoreply.service.test.ts       # 15 tests
│   │   ├── auth.service.test.ts            # 15 tests
│   │   ├── imap.service.test.ts            # 12 tests
│   │   └── smtp.service.test.ts            # 13 tests
│   ├── middleware/__tests__/
│   │   ├── auth.test.ts                    # 10 tests
│   │   ├── adminOnly.test.ts               # 7 tests
│   │   └── validate.test.ts                # 18 tests
│   └── routes/__tests__/
│       └── auth.routes.test.ts             # 18 tests
├── jest.config.js                          # Configuration Jest
└── .env.test                               # Variables d'environnement de test
```

## 🚀 Commandes

### Installation

```bash
cd server
npm install
```

### Exécution des tests

```bash
# Tous les tests
npm test

# Mode watch (rechargement auto)
npm run test:watch

# Avec couverture de code
npm run test:coverage
```

## 📝 Détail des tests par module

### 1. Utils - domainMatcher (12 tests)

Teste l'extraction du domaine depuis une adresse email.

**Scénarios couverts :**
- ✅ Emails valides simples
- ✅ Emails avec sous-domaines
- ✅ Conversion en minuscules
- ✅ Domaines avec tirets et chiffres
- ✅ Emails invalides (sans @, multiples @, vides)
- ✅ Cas limites

**Fichier :** `src/utils/__tests__/domainMatcher.test.ts`

### 2. Services - Encryption (31 tests)

Teste le chiffrement AES-256-GCM des mots de passe.

**Scénarios couverts :**
- ✅ Chiffrement de textes simples, vides, longs
- ✅ Génération d'IV différents
- ✅ Déchiffrement correct
- ✅ Détection de modifications (tag, données)
- ✅ Caractères spéciaux et Unicode
- ✅ Gestion des erreurs (tag/IV/données invalides)

**Fichier :** `src/services/__tests__/encryption.service.test.ts`

### 3. Services - Autoreply (15 tests)

Teste le processus complet d'autoréponse.

**Scénarios couverts :**
- ✅ Traitement des messages non lus
- ✅ Envoi de réponses automatiques
- ✅ Détection des messages déjà traités
- ✅ Messages personnalisés (sujet, contenu)
- ✅ Gestion des erreurs SMTP
- ✅ Traitement de plusieurs messages

**Fichier :** `src/services/__tests__/autoreply.service.test.ts`

### 4. Services - Auth (15 tests)

Teste l'authentification et la gestion des tokens JWT.

**Scénarios couverts :**
- ✅ Création de nouveaux utilisateurs
- ✅ Authentification d'utilisateurs existants
- ✅ Mise à jour des mots de passe
- ✅ Promotion admin
- ✅ Validation IMAP
- ✅ Vérification de tokens (valides, invalides, expirés)

**Fichier :** `src/services/__tests__/auth.service.test.ts`

### 5. Services - IMAP (12 tests)

Teste la validation des identifiants IMAP et la récupération de messages.

**Scénarios couverts :**
- ✅ Validation des identifiants
- ✅ Récupération des messages non lus
- ✅ Filtrage des auto-réponses
- ✅ Filtrage des "Out of Office"
- ✅ Conversion en minuscules des adresses
- ✅ Gestion des erreurs de connexion

**Fichier :** `src/services/__tests__/imap.service.test.ts`

### 6. Services - SMTP (13 tests)

Teste l'envoi d'emails via SMTP.

**Scénarios couverts :**
- ✅ Envoi de réponses automatiques
- ✅ Headers appropriés (Auto-Submitted, etc.)
- ✅ Gestion des erreurs SMTP
- ✅ Caractères spéciaux et emojis
- ✅ Messages longs
- ✅ Multiples destinataires

**Fichier :** `src/services/__tests__/smtp.service.test.ts`

### 7. Middleware - Auth (10 tests)

Teste le middleware de vérification JWT.

**Scénarios couverts :**
- ✅ Tokens valides
- ✅ Tokens invalides, expirés, malformés
- ✅ Header Authorization manquant
- ✅ Format Bearer incorrect
- ✅ Espaces supplémentaires
- ✅ Attachement des infos utilisateur

**Fichier :** `src/middleware/__tests__/auth.test.ts`

### 8. Middleware - AdminOnly (7 tests)

Teste la restriction d'accès admin.

**Scénarios couverts :**
- ✅ Autorisation des admins
- ✅ Blocage des utilisateurs normaux
- ✅ Gestion des utilisateurs non authentifiés
- ✅ Rôles invalides ou absents

**Fichier :** `src/middleware/__tests__/adminOnly.test.ts`

### 9. Middleware - Validate (18 tests)

Teste la validation des données avec Zod.

**Scénarios couverts :**
- ✅ Validation de schémas simples
- ✅ Validation de schémas complexes
- ✅ Champs requis et optionnels
- ✅ Transformations de données
- ✅ Erreurs de validation détaillées
- ✅ Contraintes personnalisées
- ✅ Mode strict

**Fichier :** `src/middleware/__tests__/validate.test.ts`

### 10. Routes - Auth (18 tests)

Tests d'intégration des endpoints d'authentification.

**Scénarios couverts :**
- ✅ POST /api/auth/login
- ✅ POST /api/auth/register
- ✅ GET /api/auth/me
- ✅ Validation des données
- ✅ Rate limiting
- ✅ Codes de statut HTTP appropriés

**Fichier :** `src/routes/__tests__/auth.routes.test.ts`

## 🔧 Configuration

### Jest (jest.config.js)

```javascript
- Preset: ts-jest
- Environment: node
- Timeout: 10000ms
- Coverage: inclut src/, exclut types, migrations, index
```

### Setup (src/__tests__/setup.ts)

Configuration globale avant les tests :
- Variables d'environnement de test
- Mock du logger Winston
- Chargement de .env.test

### Variables d'environnement (.env.test)

```env
NODE_ENV=test
JWT_SECRET=test-secret
ENCRYPTION_KEY=<64-char-hex>
DATABASE_URL=postgresql://test:test@localhost/emailauto_test
ADMIN_EMAIL=admin@test.com
```

## 🎨 Conventions de code

### Nomenclature des tests

```typescript
describe('Module - Fonction', () => {
  describe('Cas d\'utilisation', () => {
    test('doit faire quelque chose de spécifique', () => {
      // Test
    });
  });
});
```

### Structure AAA (Arrange-Act-Assert)

```typescript
test('exemple', () => {
  // Arrange - Préparation
  const input = 'test';

  // Act - Action
  const result = functionToTest(input);

  // Assert - Vérification
  expect(result).toBe('expected');
});
```

### Mocking

```typescript
jest.mock('../module');
const mockFunction = jest.fn();
```

## 📈 Amélioration continue

### Prochaines étapes suggérées

1. **Tests de modèles** : Ajouter des tests pour les modèles (UserModel, ServerModel, etc.)
2. **Tests d'intégration** : Étendre les tests d'intégration aux autres routes
3. **Tests E2E** : Ajouter des tests end-to-end avec une vraie base de données de test
4. **Performance** : Ajouter des tests de performance
5. **Sécurité** : Ajouter des tests de sécurité (injections, XSS, etc.)

### Bonnes pratiques

- ✅ Toujours nettoyer les mocks avec `beforeEach` et `afterEach`
- ✅ Tester les cas limites et les erreurs
- ✅ Maintenir une couverture > 80%
- ✅ Garder les tests simples et lisibles
- ✅ Un test = un concept
- ✅ Noms de tests descriptifs en français

## 🐛 Résolution de problèmes

### Les tests sont lents

- Augmenter le `testTimeout` dans `jest.config.js`
- Utiliser `--maxWorkers=4` pour paralléliser

### Les mocks ne fonctionnent pas

- Vérifier l'ordre : mock avant import
- Vérifier le chemin du module mocké
- Utiliser `jest.clearAllMocks()` dans `beforeEach`

### Erreurs de variables d'environnement

- Vérifier que `.env.test` existe
- Vérifier que `setup.ts` est exécuté

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/)
- [Supertest](https://github.com/visionmedia/supertest)
- [ts-jest](https://kulshekhar.github.io/ts-jest/)
- [Testing Best Practices](https://testingjavascript.com/)

## 👥 Contribution

Pour ajouter de nouveaux tests :

1. Créer le fichier de test à côté du fichier source
2. Suivre les conventions de nomenclature
3. Viser une couverture complète
4. Documenter les cas complexes
5. Exécuter `npm test` avant de commit

---

**Date de création :** 17 février 2026
**Dernière mise à jour :** 17 février 2026
**Auteur :** Claude Code (Anthropic)
