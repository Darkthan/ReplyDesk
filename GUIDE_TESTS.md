# 🚀 Guide de Démarrage Rapide - Tests EmailAuto

## ⚡ Installation rapide

```bash
# 1. Se placer dans le dossier server
cd server

# 2. Installer les dépendances (si pas déjà fait)
npm install

# 3. Exécuter les tests
npm test
```

## 📋 Commandes essentielles

```bash
# Lancer tous les tests
npm test

# Mode développement (rechargement auto)
npm run test:watch

# Voir la couverture de code
npm run test:coverage
```

## ✅ Ce qui a été créé

### 📁 10 fichiers de tests

1. ✅ **domainMatcher.test.ts** - Extraction de domaine (12 tests)
2. ✅ **encryption.service.test.ts** - Chiffrement/déchiffrement (31 tests)
3. ✅ **autoreply.service.test.ts** - Autoréponses (15 tests)
4. ✅ **auth.service.test.ts** - Authentification (15 tests)
5. ✅ **imap.service.test.ts** - Service IMAP (12 tests)
6. ✅ **smtp.service.test.ts** - Service SMTP (13 tests)
7. ✅ **auth.test.ts** - Middleware auth (10 tests)
8. ✅ **adminOnly.test.ts** - Middleware admin (7 tests)
9. ✅ **validate.test.ts** - Middleware validation (18 tests)
10. ✅ **auth.routes.test.ts** - Routes auth intégration (18 tests)

**Total : ~150 tests** 🎉

### 🔧 Fichiers de configuration

- ✅ `jest.config.js` - Configuration Jest
- ✅ `src/__tests__/setup.ts` - Setup global
- ✅ `.env.test` - Variables d'environnement de test
- ✅ `package.json` - Scripts de test ajoutés

### 📚 Documentation

- ✅ `TESTS.md` - Documentation complète des tests
- ✅ `src/__tests__/README.md` - Guide des tests
- ✅ `GUIDE_TESTS.md` - Ce fichier (guide rapide)

## 🎯 Première exécution

```bash
cd server
npm test
```

Vous devriez voir :

```
PASS  src/utils/__tests__/domainMatcher.test.ts
PASS  src/services/__tests__/encryption.service.test.ts
PASS  src/services/__tests__/autoreply.service.test.ts
...

Test Suites: 10 passed, 10 total
Tests:       151 passed, 151 total
Snapshots:   0 total
Time:        X.XXXs
```

## 📊 Voir la couverture

```bash
npm run test:coverage
```

Résultat attendu :
- Un rapport dans le terminal
- Un rapport HTML dans `coverage/lcov-report/index.html`

Ouvrez `coverage/lcov-report/index.html` dans votre navigateur pour une vue détaillée.

## 🔍 Tester un fichier spécifique

```bash
# Un seul fichier
npx jest src/utils/__tests__/domainMatcher.test.ts

# Tous les tests d'un dossier
npx jest src/services/__tests__/

# Avec un pattern
npx jest --testPathPattern=encryption
```

## 🐛 Debugging

```bash
# Mode verbose
npm test -- --verbose

# Voir les logs
npm test -- --silent=false

# Un seul test
npx jest -t "doit extraire correctement le domaine"
```

## 📝 Structure des tests

```
server/src/
├── __tests__/              # Configuration globale
│   ├── setup.ts
│   └── README.md
│
├── utils/__tests__/        # Tests utilitaires
│   └── domainMatcher.test.ts
│
├── services/__tests__/     # Tests services
│   ├── encryption.service.test.ts
│   ├── autoreply.service.test.ts
│   ├── auth.service.test.ts
│   ├── imap.service.test.ts
│   └── smtp.service.test.ts
│
├── middleware/__tests__/   # Tests middleware
│   ├── auth.test.ts
│   ├── adminOnly.test.ts
│   └── validate.test.ts
│
└── routes/__tests__/       # Tests d'intégration
    └── auth.routes.test.ts
```

## 🎨 Exemple de test

```typescript
import { extractDomain } from '../domainMatcher';

describe('domainMatcher', () => {
  test('doit extraire le domaine correctement', () => {
    const result = extractDomain('user@example.com');
    expect(result).toBe('example.com');
  });
});
```

## 💡 Astuces

### Mode watch pour le développement

```bash
npm run test:watch
```

Puis dans le terminal interactif :
- `p` : Filtrer par nom de fichier
- `t` : Filtrer par nom de test
- `a` : Relancer tous les tests
- `q` : Quitter

### Ignorer un test temporairement

```typescript
test.skip('ce test sera ignoré', () => {
  // ...
});
```

### Exécuter un seul test

```typescript
test.only('seul ce test sera exécuté', () => {
  // ...
});
```

## 🔥 Workflow recommandé

1. **Pendant le développement** : `npm run test:watch`
2. **Avant un commit** : `npm test`
3. **Avant un merge** : `npm run test:coverage`

## 📖 Documentation complète

Pour plus de détails, consultez :
- 📄 `TESTS.md` - Documentation complète
- 📄 `src/__tests__/README.md` - Guide détaillé

## ❓ Problèmes courants

### "Cannot find module"

```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

### "Timeout"

Augmenter le timeout dans `jest.config.js` :
```javascript
testTimeout: 20000, // 20 secondes
```

### "Port already in use"

Les tests n'utilisent pas de port réseau réel, mais si vous voyez cette erreur :
- Arrêter le serveur de dev (`npm run dev`)
- Ou changer le PORT dans `.env.test`

## 🎉 Félicitations !

Vous avez maintenant une suite de tests complète pour EmailAuto !

**Prochaines étapes suggérées :**
1. Exécuter `npm test` pour vérifier que tout fonctionne
2. Regarder la couverture avec `npm run test:coverage`
3. Lire `TESTS.md` pour comprendre chaque test en détail
4. Commencer à ajouter vos propres tests !

---

**Besoin d'aide ?** Consultez la documentation complète dans `TESTS.md`
