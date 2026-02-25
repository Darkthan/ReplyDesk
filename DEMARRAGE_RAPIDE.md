# ⚡ Démarrage Rapide - 5 minutes

Guide ultra-rapide pour lancer EmailAuto en local.

## 🎯 Étapes

### 1. Prérequis
- ✅ Node.js 18+ installé
- ✅ PostgreSQL 14+ installé

### 2. Installer les dépendances

```bash
npm run install:all
```

### 3. Créer la base de données

**Ouvrir PowerShell en administrateur :**

```powershell
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base
CREATE DATABASE emailauto;
CREATE USER emailauto WITH PASSWORD 'votreMotDePasse';
GRANT ALL PRIVILEGES ON DATABASE emailauto TO emailauto;
\q
```

### 4. Configurer l'environnement

```bash
# Copier l'exemple
copy .env.example .env
```

**Éditer `.env`** et changer :
- `DB_PASSWORD=votreMotDePasse`
- `ADMIN_EMAIL=votre.email@gmail.com`
- `JWT_SECRET=` (générer un secret aléatoire)
- `ENCRYPTION_KEY=` (garder celui par défaut ou générer avec `openssl rand -hex 32`)

### 5. Exécuter les migrations

```bash
npm run dev:migrate
```

### 6. Ajouter un serveur mail

```powershell
psql -U emailauto -d emailauto
```

```sql
-- Gmail
INSERT INTO mail_servers (domain, imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure)
VALUES ('gmail.com', 'imap.gmail.com', 993, true, 'smtp.gmail.com', 465, true);
\q
```

### 7. Démarrer l'application

```bash
npm run dev
```

**C'est tout ! 🎉**

- Backend : http://localhost:3000
- Frontend : http://localhost:5173

## 🔑 Se connecter

1. Aller sur http://localhost:5173
2. Cliquer sur "Se connecter"
3. Email : `votre.email@gmail.com`
4. Mot de passe : **Mot de passe d'application Gmail**

### Créer un mot de passe d'application Gmail :

1. Aller sur https://myaccount.google.com/apppasswords
2. Activer la validation en 2 étapes (si pas déjà fait)
3. Créer un mot de passe d'application
4. Utiliser ce mot de passe dans l'application

## ❓ Problèmes ?

### "Cannot connect to database"
```bash
# Vérifier que PostgreSQL est démarré
services.msc
# Chercher PostgreSQL et démarrer le service
```

### "Port 3000 already in use"
Changer `PORT=3001` dans `.env`

### "IMAP authentication failed"
- Gmail : Utilisez un mot de passe d'application
- Vérifiez que IMAP est activé dans les paramètres

## 📚 Documentation complète

Pour plus de détails : `GUIDE_LOCAL.md`

## 🧪 Tester l'application

1. Créer une période de fermeture (interface admin)
2. S'y abonner (interface utilisateur)
3. Envoyer un email de test
4. Attendre 1 minute
5. Recevoir l'auto-réponse !

---

**Démarrage réussi ? Consultez `GUIDE_LOCAL.md` pour plus d'options !**
