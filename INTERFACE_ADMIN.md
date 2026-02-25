# 🎨 Interface Admin - Guide d'utilisation

## ✅ Compte admin par défaut

Un compte administrateur par défaut est créé automatiquement lors de la migration :

**🔑 Identifiants par défaut** :
- **Username** : `admin`
- **Password** : `admin123`

⚠️ **IMPORTANT** : Changez ce mot de passe dès la première utilisation !

---

## 🚀 Accès à l'interface admin

### URL directe

Allez simplement sur : **http://localhost:5173/admin**

**Ce qui se passe** :
1. Vous êtes automatiquement redirigé vers `/admin/login` si non connecté
2. Après connexion, vous arrivez sur `/admin/servers`

### Pages disponibles

- **`/admin`** → Redirige vers `/admin/servers`
- **`/admin/login`** → Page de connexion admin
- **`/admin/servers`** → Gestion des serveurs de messagerie
- **`/admin/closures`** → Gestion des périodes de fermeture
- **`/admin/users`** → Gestion des utilisateurs

---

## 📝 Première connexion

### Étape 1 : Accéder à l'interface

```
http://localhost:5173/admin
```

Vous serez redirigé vers `/admin/login`

### Étape 2 : Se connecter

**Nom d'utilisateur** : `admin`
**Mot de passe** : `admin123`

### Étape 3 : Changer le mot de passe

Après la première connexion, changez IMMÉDIATEMENT le mot de passe :

```powershell
node scripts/changeAdminPassword.js VotreNouveauMotDePasse
```

Puis reconnectez-vous avec le nouveau mot de passe.

---

## 🎯 Utilisation de l'interface

### 1. Serveurs de messagerie (`/admin/servers`)

**Ajouter un serveur** :
1. Cliquez sur "Ajouter un serveur"
2. Remplissez :
   - **Domaine** : `gmail.com`
   - **Nom d'affichage** : `Gmail`
   - **IMAP** : `imap.gmail.com:993` (SSL activé)
   - **SMTP** : `smtp.gmail.com:465` (SSL activé)
3. Cliquez sur "Enregistrer"

**Exemple de serveurs** :

| Domaine | IMAP | SMTP |
|---------|------|------|
| gmail.com | imap.gmail.com:993 (SSL) | smtp.gmail.com:465 (SSL) |
| outlook.com | outlook.office365.com:993 (SSL) | smtp.office365.com:587 (TLS) |
| yahoo.com | imap.mail.yahoo.com:993 (SSL) | smtp.mail.yahoo.com:465 (SSL) |

### 2. Périodes de fermeture (`/admin/closures`)

**Créer une période** :
1. Cliquez sur "Nouvelle période"
2. Remplissez :
   - **Nom** : `Vacances de Noël 2025`
   - **Date de début** : `20/12/2025`
   - **Date de fin** : `05/01/2026`
   - **Sujet par défaut** : `Absence pour congés`
   - **Message par défaut** : `Je suis actuellement absent...`
3. Activez la période
4. Cliquez sur "Créer"

### 3. Utilisateurs (`/admin/users`)

**Gérer les utilisateurs** :
- 👥 Voir la liste de tous les utilisateurs
- 🔄 Activer/désactiver un utilisateur
- 🗑️ Supprimer un utilisateur
- 📊 Voir leurs abonnements

**Note** : Les utilisateurs se créent automatiquement lors de leur première connexion (si leur domaine est configuré).

---

## 🔄 Workflow complet

### Configuration initiale (Admin)

```
1. Admin se connecte sur /admin
   ↓
2. Admin ajoute gmail.com dans "Serveurs"
   ↓
3. Admin crée une période "Vacances Noël"
   ↓
4. Admin active la période
```

### Inscription utilisateur

```
5. User va sur /login (pas /admin/login)
   ↓
6. User entre email@gmail.com + mot de passe IMAP
   ↓
7. Système vérifie : gmail.com configuré ? ✅
   ↓
8. User créé et connecté
   ↓
9. User s'abonne à "Vacances Noël"
```

---

## 🎨 Différences visuelles

### Page Admin (`/admin/login`)
- 🎨 Fond violet/indigo
- 🔒 Icône de cadenas
- 📝 Champs : Username + Password
- 💡 Info : "admin / admin123"
- 🔗 Lien vers connexion utilisateur

### Page Utilisateur (`/login`)
- 🎨 Fond standard
- 📧 Champs : Email + Password IMAP
- 💡 Info sur mot de passe d'application Gmail

### Navigation Admin
- 🎯 Menu horizontal : Serveurs / Périodes / Utilisateurs
- 👤 Badge avec username admin
- 🚪 Bouton déconnexion rouge

### Navigation Utilisateur
- 🏠 Tableau de bord
- 📊 Mes abonnements
- 👤 Badge avec email

---

## 🔐 Sécurité

### Tokens séparés

**Admin** :
- Stocké dans `localStorage.adminToken`
- Type : `admin`
- Payload : `{ adminId, username, type: 'admin' }`

**Utilisateur** :
- Stocké dans `localStorage.token`
- Type : `user`
- Payload : `{ userId, email, role: 'user' }`

### Pas de collision possible

Un admin ne peut pas accéder aux routes utilisateur avec son token admin, et vice-versa.

### Session expirée

Si le token expire :
- ❌ Redirection automatique vers `/admin/login`
- 🗑️ Token supprimé du localStorage
- 💡 Message : "Session expirée"

---

## 🧪 Tester l'interface

### Test 1 : Accès direct à /admin

```
1. Aller sur http://localhost:5173/admin
   ↓
2. Redirection automatique vers /admin/login
   ↓
3. Se connecter avec admin/admin123
   ↓
4. Arrivée sur /admin/servers ✅
```

### Test 2 : Session persistante

```
1. Se connecter en tant qu'admin
2. Fermer le navigateur
3. Rouvrir et aller sur /admin
   ↓
   Vous êtes toujours connecté ✅
```

### Test 3 : Déconnexion

```
1. Cliquer sur "Déconnexion"
   ↓
2. Redirection vers /admin/login
   ↓
3. Essayer d'aller sur /admin/servers
   ↓
   Redirection vers /admin/login ✅
```

---

## 🛠️ Modification du mot de passe admin

### Méthode 1 : Via script (recommandé)

```powershell
node scripts/changeAdminPassword.js NouveauMotDePasse
```

### Méthode 2 : Via SQL

```powershell
psql -U emailauto -d emailauto
```

```sql
-- Générer le hash avec bcrypt (dans Node.js)
-- const bcrypt = require('bcrypt');
-- bcrypt.hash('NouveauMotDePasse', 10, (err, hash) => console.log(hash));

UPDATE admins
SET password_hash = 'VotreHashBcrypt',
    updated_at = NOW()
WHERE username = 'admin';

\q
```

### Méthode 3 : Via interface (TODO)

Une page de paramètres admin sera ajoutée prochainement pour changer le mot de passe directement depuis l'interface.

---

## 📱 Responsive

L'interface admin est responsive et fonctionne sur :
- 💻 Desktop
- 📱 Tablette
- 📱 Mobile

---

## ⚠️ Erreurs courantes

### "Redirection infinie vers /admin/login"

**Causes** :
- Token expiré ou invalide
- localStorage corrompu

**Solutions** :
```javascript
// Dans la console du navigateur (F12)
localStorage.clear();
// Puis rechargez la page
```

### "Cannot read property 'username' of null"

**Cause** : Tentative d'accès sans être connecté

**Solution** : Rafraîchir la page, la redirection se fera automatiquement

### "CORS error"

**Cause** : Le serveur backend n'est pas démarré

**Solution** :
```powershell
npm run dev:local
```

---

## 🎉 Récapitulatif

**Ce qui fonctionne** :
- ✅ Page de connexion admin (`/admin/login`)
- ✅ Redirection automatique si non connecté
- ✅ Interface admin complète
- ✅ Navigation entre les pages
- ✅ Déconnexion
- ✅ Session persistante
- ✅ Compte par défaut : `admin` / `admin123`

**À faire** :
- [ ] Page de changement de mot de passe dans l'interface
- [ ] Logs de connexion admin
- [ ] Gestion multi-admins dans l'interface
- [ ] Notifications en temps réel

---

**L'interface admin est prête à l'emploi ! 🚀**

**Accédez-y sur** : http://localhost:5173/admin
