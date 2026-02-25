# 🚀 Guide de Démarrage Local - EmailAuto

Ce guide vous explique comment lancer l'application EmailAuto en local sur votre PC pour tester avant de déployer.

## 📋 Prérequis

### Logiciels nécessaires

1. **Node.js** (version 18 ou supérieure)
   - Vérifier : `node --version`
   - Télécharger : https://nodejs.org/

2. **PostgreSQL** (version 14 ou supérieure)
   - Vérifier : `psql --version`
   - Télécharger : https://www.postgresql.org/download/

3. **Git** (pour cloner le projet)
   - Vérifier : `git --version`

### Comptes de messagerie

Pour tester l'application, vous aurez besoin :
- Un compte email avec accès IMAP/SMTP
- Les identifiants de connexion
- Les paramètres du serveur (host, port)

**Exemple avec Gmail :**
- IMAP : imap.gmail.com:993 (SSL)
- SMTP : smtp.gmail.com:465 (SSL)
- Note : Activer "Applications moins sécurisées" ou utiliser un mot de passe d'application

## 🔧 Installation

### 1. Installer les dépendances

```bash
# À la racine du projet
npm run install:all
```

Ou manuellement :

```bash
# Racine
npm install

# Serveur
cd server
npm install

# Client
cd ../client
npm install
```

### 2. Configurer PostgreSQL

#### Créer la base de données

**Windows (PowerShell ou CMD) :**
```bash
# Se connecter à PostgreSQL
psql -U postgres

# Dans le shell PostgreSQL :
CREATE DATABASE emailauto;
CREATE USER emailauto WITH PASSWORD 'votreMotDePasse';
GRANT ALL PRIVILEGES ON DATABASE emailauto TO emailauto;

# Quitter
\q
```

**Linux/Mac :**
```bash
sudo -u postgres psql

# Puis mêmes commandes SQL
```

### 3. Configurer les variables d'environnement

#### Créer le fichier `.env` dans le dossier racine

```bash
# Copier l'exemple
cp .env.example .env
```

#### Éditer `.env` avec vos paramètres

```env
# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=emailauto
DB_USER=emailauto
DB_PASSWORD=votreMotDePasse

# Sécurité
JWT_SECRET=votre-secret-jwt-minimum-32-caracteres-aleatoires
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Admin
ADMIN_EMAIL=votre.email@example.com

# Application
PORT=3000
NODE_ENV=development

# Polling (optionnel)
POLLING_INTERVAL_MS=60000
```

**⚠️ IMPORTANT pour ENCRYPTION_KEY :**

La clé de chiffrement DOIT être de 64 caractères hexadécimaux (32 bytes). Générez-la avec :

**Windows (PowerShell) :**
```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
($bytes | ForEach-Object { $_.ToString("x2") }) -join ''
```

**Linux/Mac :**
```bash
openssl rand -hex 32
```

### 4. Exécuter les migrations

Les migrations créent les tables dans la base de données.

```bash
# À la racine du projet
npm run dev:migrate
```

Ou manuellement :

```bash
cd server
npm run migrate
```

**Vérifier que les tables sont créées :**

```bash
psql -U emailauto -d emailauto

# Dans PostgreSQL :
\dt

# Vous devriez voir :
# - mail_servers
# - users
# - closure_periods
# - user_subscriptions
# - reply_logs

\q
```

### 5. Configurer un serveur mail de test

Vous devez ajouter au moins un serveur mail dans la base de données.

**Option 1 : Via SQL**

```bash
psql -U emailauto -d emailauto
```

```sql
-- Exemple avec Gmail
INSERT INTO mail_servers (domain, imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure)
VALUES ('gmail.com', 'imap.gmail.com', 993, true, 'smtp.gmail.com', 465, true);

-- Exemple avec Outlook
INSERT INTO mail_servers (domain, imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure)
VALUES ('outlook.com', 'outlook.office365.com', 993, true, 'smtp.office365.com', 587, true);

-- Vérifier
SELECT * FROM mail_servers;

\q
```

**Option 2 : Via l'interface admin (après démarrage)**

Vous pourrez ajouter des serveurs via l'interface une fois l'application démarrée.

## 🚀 Démarrage de l'application

### Option 1 : Démarrage complet (recommandé)

Lance la base de données, le serveur et le client en parallèle :

```bash
# À la racine du projet
npm run dev
```

Cette commande lance :
- 🗄️ PostgreSQL via Docker (si docker-compose.dev.yml existe)
- 🔧 Serveur backend sur http://localhost:3000
- 🎨 Client frontend sur http://localhost:5173

### Option 2 : Démarrage manuel (mode développement)

**Terminal 1 - Serveur :**
```bash
cd server
npm run dev
```
Serveur démarré sur http://localhost:3000

**Terminal 2 - Client :**
```bash
cd client
npm run dev
```
Client démarré sur http://localhost:5173

### Option 3 : Utiliser Docker (optionnel)

Si vous avez Docker installé :

```bash
# Lancer uniquement la base de données
npm run dev:db

# Dans un autre terminal, lancer le serveur
npm run dev:server

# Dans un autre terminal, lancer le client
npm run dev:client
```

## 🧪 Tester l'application

### 1. Accéder à l'interface

Ouvrez votre navigateur : **http://localhost:5173**

### 2. Créer un compte / Se connecter

1. Cliquez sur "S'inscrire" ou "Se connecter"
2. Entrez votre **adresse email complète** (ex: vous@gmail.com)
3. Entrez votre **mot de passe IMAP** (le mot de passe de votre boîte mail)
4. L'application va :
   - Vérifier vos identifiants IMAP
   - Créer votre compte
   - Vous connecter automatiquement

**⚠️ Pour Gmail :**
- Activez l'authentification à 2 facteurs
- Créez un "Mot de passe d'application" : https://myaccount.google.com/apppasswords
- Utilisez ce mot de passe d'application au lieu de votre mot de passe habituel

### 3. Tester les fonctionnalités

**Utilisateur normal :**
- ✅ Voir le tableau de bord
- ✅ S'abonner aux périodes de fermeture
- ✅ Personnaliser les messages d'auto-réponse
- ✅ Voir l'historique des réponses

**Administrateur :**
- ✅ Gérer les serveurs de messagerie
- ✅ Créer des périodes de fermeture
- ✅ Gérer les utilisateurs

**Comment devenir admin :**
- Votre email doit correspondre à la variable `ADMIN_EMAIL` dans `.env`
- Reconnectez-vous après avoir défini `ADMIN_EMAIL`

### 4. Tester l'autoréponse

1. **Créez une période de fermeture** (en tant qu'admin)
   - Dates : aujourd'hui → dans quelques jours
   - Sujet : "Absence"
   - Message : "Je suis absent, je reviens bientôt"

2. **Abonnez-vous à cette période** (en tant qu'utilisateur)
   - Allez dans le tableau de bord
   - Activez l'abonnement
   - Personnalisez le message si souhaité

3. **Envoyez un email de test**
   - Depuis un autre compte email
   - Envoyez un email à votre adresse
   - Attendez 1 minute (intervalle de polling)

4. **Vérifiez l'auto-réponse**
   - Vous devriez recevoir la réponse automatique
   - Vérifiez dans le tableau de bord (historique des réponses)

## 🔍 Vérifier que tout fonctionne

### Vérifier le serveur

```bash
# Tester l'API health check
curl http://localhost:3000/api/health

# Réponse attendue :
# {"status":"ok"}
```

### Vérifier la base de données

```bash
psql -U emailauto -d emailauto -c "SELECT COUNT(*) FROM users;"
```

### Voir les logs

Les logs du serveur s'affichent dans le terminal où vous avez lancé `npm run dev:server`

**Logs utiles :**
- Connexion IMAP
- Envoi d'emails
- Erreurs éventuelles

## 🐛 Résolution de problèmes

### Erreur : "Cannot connect to database"

**Solutions :**
1. Vérifiez que PostgreSQL est démarré
   ```bash
   # Windows
   services.msc → PostgreSQL

   # Linux
   sudo systemctl status postgresql
   ```

2. Vérifiez les paramètres de connexion dans `.env`
3. Vérifiez que la base de données existe
   ```bash
   psql -U postgres -c "\l" | grep emailauto
   ```

### Erreur : "Port 3000 already in use"

**Solutions :**
1. Changez le port dans `.env` :
   ```env
   PORT=3001
   ```

2. Ou trouvez et arrêtez le processus utilisant le port :
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F

   # Linux/Mac
   lsof -i :3000
   kill -9 <PID>
   ```

### Erreur : "IMAP authentication failed"

**Solutions Gmail :**
1. Activez l'authentification à 2 facteurs
2. Créez un mot de passe d'application
3. Utilisez ce mot de passe d'application

**Solutions Outlook :**
1. Activez IMAP dans les paramètres Outlook
2. Utilisez votre mot de passe habituel

**Autres fournisseurs :**
- Vérifiez que IMAP est activé
- Vérifiez les paramètres du serveur (host, port, SSL)

### Erreur : "Invalid encryption key"

**Solution :**
- Générez une nouvelle clé de 64 caractères hexadécimaux
- Remplacez dans `.env`
- Redémarrez le serveur

### Erreur : "JWT secret too short"

**Solution :**
- Utilisez un secret d'au moins 32 caractères
- Exemple : `openssl rand -base64 32`

### Les auto-réponses ne fonctionnent pas

**Vérifications :**
1. ✅ Une période de fermeture est active (dates correctes)
2. ✅ Vous êtes abonné à cette période
3. ✅ Votre abonnement est actif
4. ✅ Le message test n'est pas un auto-reply (from = noreply@...)
5. ✅ Attendez 1-2 minutes (intervalle de polling)
6. ✅ Vérifiez les logs du serveur

## 📊 Structure de l'application locale

```
emailAuto/
├── client/                 # Frontend React
│   ├── src/
│   └── http://localhost:5173
│
├── server/                 # Backend Express
│   ├── src/
│   └── http://localhost:3000
│
└── PostgreSQL              # Base de données
    └── localhost:5432
```

## 🔐 Sécurité en développement local

**⚠️ IMPORTANT :**

1. **Ne committez JAMAIS le fichier `.env`** (déjà dans .gitignore)
2. **Utilisez des secrets différents en production**
3. **N'utilisez pas votre mot de passe email principal**
   - Utilisez des mots de passe d'application
4. **La clé de chiffrement doit être unique et secrète**

## 🚢 Avant de déployer

### Checklist de vérification

- [ ] Tous les tests passent : `npm test`
- [ ] L'application fonctionne en local
- [ ] Les auto-réponses fonctionnent
- [ ] Les variables d'environnement sont prêtes pour la production
- [ ] Les secrets sont différents de ceux de développement
- [ ] La base de données de production est prête
- [ ] Les migrations sont testées

### Tester avant déploiement

```bash
# 1. Lancer les tests
cd server
npm test

# 2. Construire le projet
npm run build

# 3. Tester en mode production
NODE_ENV=production npm start
```

## 📚 Commandes utiles

```bash
# Développement
npm run dev                    # Lancer tout
npm run dev:server             # Serveur seulement
npm run dev:client             # Client seulement
npm run dev:db                 # Base de données seulement

# Base de données
npm run dev:migrate            # Exécuter les migrations

# Tests
cd server
npm test                       # Tous les tests
npm run test:watch             # Mode watch
npm run test:coverage          # Avec couverture

# Production
cd server
npm run build                  # Compiler TypeScript
npm start                      # Démarrer en production
```

## 🆘 Besoin d'aide ?

1. Consultez les logs dans le terminal
2. Vérifiez la base de données
3. Testez les endpoints avec curl ou Postman
4. Consultez la documentation des tests : `TESTS.md`

---

**Bon développement ! 🚀**
