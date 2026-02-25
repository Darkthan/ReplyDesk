# ⚡ Guide de Migration - Authentification Admin

## 🎯 Ce qui a changé

**AVANT** :
- ❌ Admin = utilisateur avec rôle spécial dans la table `users`
- ❌ Admin doit avoir un compte IMAP configuré
- ❌ N'importe quel utilisateur peut s'inscrire si IMAP valide

**MAINTENANT** :
- ✅ Admin autonome avec username/password (table séparée `admins`)
- ✅ Utilisateurs restreints aux domaines configurés
- ✅ Sécurité renforcée

---

## 🚀 Étapes de migration (5 minutes)

### 1. Installer les nouvelles dépendances

```powershell
cd server
npm install
```

### 2. Exécuter la migration

```powershell
# À la racine
npm run dev:migrate
```

**Ce que fait la migration** :
- ✅ Crée la table `admins`
- ✅ Crée l'admin par défaut : `admin` / `admin123`
- ✅ Convertit tous les users "admin" en "user"

### 3. Changer le mot de passe admin

```powershell
node scripts/changeAdminPassword.js VotreNouveauMotDePasse
```

Ou manuellement :

```powershell
psql -U emailauto -d emailauto
```

```sql
-- Générer le hash avec bcrypt (rounds=10)
-- Utilisez un outil en ligne ou Node.js

UPDATE admins
SET password_hash = 'VotreHashBcrypt',
    updated_at = NOW()
WHERE username = 'admin';

\q
```

### 4. Redémarrer l'application

```powershell
# Arrêter avec Ctrl+C, puis
npm run dev:local
```

---

## 🔑 Se connecter en tant qu'admin

### Via API (Postman / curl)

```powershell
curl -X POST http://localhost:3000/api/admin/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"username\":\"admin\",\"password\":\"VotreNouveauMotDePasse\"}'
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

### Via Interface (TODO)

Une interface de connexion admin sera disponible prochainement.

---

## 🛡️ Vérifier la sécurité utilisateur

### Test 1 : Domaine configuré ✅

```powershell
# 1. Ajouter gmail.com dans mail_servers (si pas déjà fait)
psql -U emailauto -d emailauto
```

```sql
INSERT INTO mail_servers (domain, imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure, display_name)
VALUES ('gmail.com', 'imap.gmail.com', 993, true, 'smtp.gmail.com', 465, true, 'Gmail');
\q
```

```powershell
# 2. Essayer de se connecter avec un compte Gmail
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"user@gmail.com\",\"imapPassword\":\"MotDePasseApp\"}'

# ✅ Devrait fonctionner (si identifiants corrects)
```

### Test 2 : Domaine NON configuré ❌

```powershell
# Essayer avec un domaine non dans mail_servers
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"user@yahoo.com\",\"imapPassword\":\"password\"}'

# ❌ Devrait retourner :
# {"error":"Identifiants invalides ou serveur mail non configuré"}
```

---

## 📊 Vérifications

### Vérifier la table admins

```powershell
psql -U emailauto -d emailauto
```

```sql
SELECT username, email, is_active, created_at FROM admins;

-- Résultat attendu :
--  username |        email              | is_active |     created_at
-- ----------+---------------------------+-----------+---------------------
--  admin    | admin@emailauto.local     | t         | 2025-02-18 ...
```

### Vérifier qu'il n'y a plus d'admin dans users

```sql
SELECT email, role FROM users WHERE role = 'admin';

-- Résultat attendu : (0 rows)
```

### Vérifier les serveurs configurés

```sql
SELECT domain, display_name FROM mail_servers ORDER BY domain;

-- Liste des domaines autorisés pour l'inscription utilisateur
```

```sql
\q
```

---

## 🔄 Workflow complet

### Admin configure les serveurs

```
1. Admin se connecte avec username/password
   ↓
2. Admin ajoute gmail.com dans mail_servers
   ↓
3. Admin configure IMAP/SMTP pour gmail.com
```

### Utilisateur s'inscrit

```
4. Utilisateur entre email@gmail.com + mot de passe IMAP
   ↓
5. Système vérifie : gmail.com dans mail_servers ? ✅
   ↓
6. Système valide IMAP avec le serveur configuré
   ↓
7. Utilisateur créé et connecté
```

### Utilisateur bloqué

```
4. Utilisateur entre email@yahoo.com + mot de passe IMAP
   ↓
5. Système vérifie : yahoo.com dans mail_servers ? ❌
   ↓
6. ❌ REJET : "Serveur mail non configuré"
```

---

## 📝 Checklist de migration

- [ ] ✅ Dépendances installées (`npm install`)
- [ ] ✅ Migration 002 exécutée
- [ ] ✅ Table `admins` créée
- [ ] ✅ Admin par défaut existe (admin/admin123)
- [ ] ✅ Mot de passe admin changé
- [ ] ✅ Test connexion admin réussi
- [ ] ✅ Serveur mail (gmail.com) configuré
- [ ] ✅ Test utilisateur gmail.com ✅
- [ ] ✅ Test utilisateur yahoo.com ❌

---

## 🆘 Problèmes courants

### "Module bcrypt not found"

```powershell
cd server
npm install
```

### "Table admins does not exist"

```powershell
npm run dev:migrate
```

### "Admin login returns 401"

Mot de passe incorrect. Réinitialisez :

```powershell
node scripts/changeAdminPassword.js NouveauMotDePasse
```

### "User can still register with any domain"

Vérifiez que :
1. La migration 002 a bien été exécutée
2. Le serveur utilise le nouveau code (redémarré)
3. Le domaine n'est pas dans `mail_servers`

---

## 📚 Documentation complète

Pour plus de détails : **`ADMIN_AUTH.md`**

---

**Migration terminée ! 🎉**

**Prochaines étapes** :
1. Configurer l'interface client pour la connexion admin
2. Ajouter vos serveurs de messagerie
3. Inviter vos utilisateurs !
