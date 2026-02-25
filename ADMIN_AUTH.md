# 🔐 Authentification Admin Autonome - EmailAuto

## 🎯 Principe

Le système utilise maintenant **deux types d'authentification séparés** :

### 1. **Administrateurs** 👑
- **Connexion** : Username + Password (classique)
- **Stockage** : Base de données locale (table `admins`)
- **Mot de passe** : Hashé avec bcrypt
- **Autonome** : Pas besoin de serveur IMAP
- **Rôle** : Configurer les serveurs, périodes, utilisateurs

### 2. **Utilisateurs standards** 👤
- **Connexion** : Email + Mot de passe IMAP
- **Validation** : Via le serveur IMAP configuré
- **Restriction** : Le domaine DOIT être dans `mail_servers`
- **Rôle** : S'abonner aux périodes de fermeture

---

## 🚀 Installation

### Étape 1 : Installer les dépendances

```powershell
cd server
npm install
```

Cela installe `bcrypt` pour le hashage des mots de passe.

### Étape 2 : Exécuter la nouvelle migration

```powershell
# À la racine du projet
npm run dev:migrate
```

Cette migration :
- ✅ Crée la table `admins`
- ✅ Crée un admin par défaut : `admin` / `admin123`
- ✅ Supprime le rôle `admin` des utilisateurs IMAP

**⚠️ IMPORTANT** : Changez le mot de passe admin par défaut en production !

### Étape 3 : Redémarrer le serveur

```powershell
npm run dev:local
```

---

## 🔑 Connexion Admin

### Identifiants par défaut

**Username** : `admin`
**Mot de passe** : `admin123`

### URL de connexion

**API** : `POST http://localhost:3000/api/admin/auth/login`

**Body** :
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Réponse** :
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "admin": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@emailauto.local"
  }
}
```

---

## 🔒 Changer le mot de passe admin

### Option 1 : Via SQL (recommandé pour le premier changement)

```powershell
psql -U emailauto -d emailauto
```

```sql
-- Générer un nouveau hash bcrypt pour le mot de passe 'VotreNouveauMotDePasse'
-- Utilisez un outil en ligne ou Node.js :
-- const bcrypt = require('bcrypt');
-- bcrypt.hash('VotreNouveauMotDePasse', 10, (err, hash) => console.log(hash));

UPDATE admins
SET password_hash = '$2b$10$VotreNouveauHashBcrypt',
    updated_at = NOW()
WHERE username = 'admin';

\q
```

### Option 2 : Via Node.js (script rapide)

Créez un fichier `scripts/changeAdminPassword.js` :

```javascript
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function changePassword() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
      'postgresql://emailauto:votremotdepasse@localhost:5432/emailauto'
  });

  const newPassword = process.argv[2];

  if (!newPassword) {
    console.error('Usage: node scripts/changeAdminPassword.js <nouveau-mot-de-passe>');
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, 10);

  await pool.query(
    'UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE username = $2',
    [hash, 'admin']
  );

  console.log('✅ Mot de passe administrateur changé avec succès !');
  await pool.end();
}

changePassword();
```

**Utilisation** :
```powershell
node scripts/changeAdminPassword.js VotreNouveauMotDePasse
```

---

## 👥 Créer un nouvel administrateur

### Via SQL

```powershell
psql -U emailauto -d emailauto
```

```sql
-- Insérer un nouvel admin (générez le hash avec bcrypt)
INSERT INTO admins (username, password_hash, email)
VALUES ('john.admin', '$2b$10$HashGenerePourMotDePasse', 'john@example.com');

-- Vérifier
SELECT username, email, is_active FROM admins;
\q
```

---

## 🛡️ Sécurité - Restriction des utilisateurs

### Comment ça fonctionne ?

**Avant** (ancien système) :
- ❌ N'importe quel utilisateur avec un compte email valide pouvait s'inscrire
- ❌ L'admin était juste un utilisateur avec un rôle spécial

**Maintenant** (nouveau système) :
- ✅ Seuls les utilisateurs des domaines configurés peuvent s'inscrire
- ✅ L'admin est complètement séparé avec son propre système
- ✅ Les utilisateurs doivent avoir un serveur mail configuré

### Exemple de restriction

**Scénario** :
1. Admin configure uniquement `gmail.com` dans `mail_servers`
2. Utilisateur avec `user@gmail.com` → ✅ Peut s'inscrire
3. Utilisateur avec `user@yahoo.com` → ❌ Refusé (domaine non configuré)

**Message d'erreur** :
```json
{
  "error": "Identifiants invalides ou serveur mail non configuré"
}
```

### Workflow d'inscription utilisateur

```
1. Utilisateur entre email + mot de passe IMAP
   ↓
2. Système extrait le domaine (ex: gmail.com)
   ↓
3. Vérification: domaine existe dans mail_servers ?
   ├─ OUI → Continue
   └─ NON → ❌ REJET
   ↓
4. Validation IMAP avec les paramètres du serveur
   ├─ SUCCÈS → Utilisateur créé/connecté
   └─ ÉCHEC → ❌ Mot de passe incorrect
```

---

## 🔄 Différences Admin vs Utilisateur

| Critère | Admin 👑 | Utilisateur 👤 |
|---------|----------|---------------|
| **Authentification** | Username/Password local | Email/Password IMAP |
| **Stockage MDP** | Hash bcrypt en base | Chiffré AES-256-GCM |
| **Serveur externe** | Non requis | IMAP/SMTP requis |
| **Restriction** | Accès total | Domaine doit être configuré |
| **Peut configurer** | Serveurs, périodes, users | Non |
| **Peut s'abonner** | Non | Oui |
| **Auto-réponses** | Non | Oui |

---

## 📊 Structure des tables

### Table `admins`

```sql
CREATE TABLE admins (
    id UUID PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    password_hash TEXT,         -- bcrypt hash
    email VARCHAR(255),
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### Table `users` (inchangée sauf role)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(10),            -- Maintenant seulement 'user'
    imap_password_enc TEXT,      -- AES-256-GCM
    imap_password_iv TEXT,
    imap_password_tag TEXT,
    mail_server_id UUID,
    ...
);
```

---

## 🔌 API Endpoints

### Admin

```
POST   /api/admin/auth/login    # Connexion admin
GET    /api/admin/auth/me       # Info admin (authentifié)
```

### Utilisateur (inchangé)

```
POST   /api/auth/login          # Connexion/inscription utilisateur
POST   /api/auth/register       # Alias de login
GET    /api/auth/me             # Info utilisateur (authentifié)
```

---

## 🧪 Tester l'authentification

### Test Admin

```powershell
# Connexion admin
curl -X POST http://localhost:3000/api/admin/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"username\":\"admin\",\"password\":\"admin123\"}'

# Réponse
# {"token":"...","admin":{"id":"...","username":"admin","email":"..."}}
```

### Test Utilisateur (domaine configuré)

```powershell
# Connexion utilisateur Gmail (si gmail.com est configuré)
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"user@gmail.com\",\"imapPassword\":\"AppPassword123\"}'
```

### Test Utilisateur (domaine non configuré)

```powershell
# Connexion utilisateur Yahoo (si yahoo.com n'est PAS configuré)
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"user@yahoo.com\",\"imapPassword\":\"password\"}'

# Réponse
# {"error":"Identifiants invalides ou serveur mail non configuré"}
```

---

## 🎨 Interface Client (TODO)

**À implémenter** :
- [ ] Page de connexion admin séparée (`/admin/login`)
- [ ] Page de connexion utilisateur (`/login`)
- [ ] Affichage du type de compte dans le header
- [ ] Gestion des admins dans l'interface

---

## ⚠️ Sécurité - Bonnes pratiques

### En développement

✅ Admin par défaut : `admin` / `admin123` (pour tester)

### En production

1. **Changer le mot de passe admin par défaut**
   ```sql
   UPDATE admins SET password_hash = '$2b$10$NouveauHash' WHERE username = 'admin';
   ```

2. **Créer des admins avec des mots de passe forts**
   - Minimum 12 caractères
   - Majuscules, minuscules, chiffres, symboles

3. **Désactiver les admins inutilisés**
   ```sql
   UPDATE admins SET is_active = false WHERE username = 'old_admin';
   ```

4. **Logs de connexion** (à implémenter)
   - Enregistrer les tentatives de connexion
   - Détecter les attaques par force brute

5. **Rate limiting**
   - Déjà en place pour `/api/auth`
   - Ajouter pour `/api/admin/auth`

---

## 📝 Checklist migration

Avant de déployer :

- [ ] Migration 002 exécutée
- [ ] Admin par défaut testé
- [ ] Mot de passe admin changé
- [ ] Serveurs mail configurés
- [ ] Test utilisateur domaine autorisé ✅
- [ ] Test utilisateur domaine non autorisé ❌
- [ ] Documentation lue et comprise

---

## 🆘 Dépannage

### "Cannot find module 'bcrypt'"

```powershell
cd server
npm install bcrypt @types/bcrypt
```

### "Table admins does not exist"

```powershell
# Exécuter la migration
npm run dev:migrate
```

### "Admin login fails"

```powershell
# Vérifier que l'admin existe
psql -U emailauto -d emailauto -c "SELECT * FROM admins;"

# Réinitialiser le mot de passe
# (voir section "Changer le mot de passe admin")
```

### "User with yahoo.com can register"

Vérifiez que le domaine n'est PAS dans `mail_servers` :

```sql
SELECT * FROM mail_servers WHERE domain = 'yahoo.com';
-- Si trouvé, le supprimer pour restreindre
DELETE FROM mail_servers WHERE domain = 'yahoo.com';
```

---

**Authentification admin autonome configurée ! 🎉**

**Prochaine étape** : Mettre à jour l'interface client pour gérer les deux types de connexion.
