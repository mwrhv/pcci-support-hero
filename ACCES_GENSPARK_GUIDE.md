# 🎯 Guide d'Accès à Genspark AI Analysis

## 📋 Table des Matières
1. [Méthodes d'Accès](#méthodes-daccès)
2. [Vérification des Droits](#vérification-des-droits)
3. [Créer un Compte Superviseur](#créer-un-compte-superviseur)
4. [Dépannage](#dépannage)

---

## 🚪 Méthodes d'Accès

### **Méthode 1: Via le Menu (RECOMMANDÉE)**

**Étapes détaillées:**

1. **Connexion**
   ```
   1. Ouvrez votre navigateur
   2. Allez sur: https://votre-domaine.com
   3. Cliquez sur "Connexion" ou "Se connecter"
   4. Entrez vos identifiants (email + mot de passe)
   5. Cliquez sur "Se connecter"
   ```

2. **Navigation vers Genspark**
   ```
   1. Regardez en haut à droite de la page
   2. Vous verrez votre avatar (photo ou initiales)
   3. Cliquez sur cet avatar
   4. Un menu déroulant s'ouvre
   5. Cherchez "🧠 Genspark AI Analysis"
   6. Cliquez dessus
   ```

**Visuel du menu:**
```
┌─────────────────────────────────────────┐
│  PCCI Help Desk         [👤 JD] ▼      │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ John Doe                          │ │
│  │ john.doe@pcci.com                 │ │
│  │ supervisor                        │ │
│  ├───────────────────────────────────┤ │
│  │ 👤 Profil                         │ │
│  │ ⚙️  Gestion des Utilisateurs      │ │
│  │ 📊 Analyse statistique            │ │
│  │ 🧠 Genspark AI Analysis  ← CLIC  │ │
│  │ 📝 Logs d'Audit                   │ │
│  │ ─────────────────────────────────  │ │
│  │ 🚪 Déconnexion                    │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

### **Méthode 2: URL Directe**

**Étapes:**

1. **Connectez-vous d'abord** à l'application
2. **Copiez cette URL** (en remplaçant par votre domaine):
   ```
   https://votre-domaine.com/admin/genspark
   ```
3. **Collez dans la barre d'adresse**
4. **Appuyez sur Entrée**

**Exemples d'URL:**
```
Localhost (développement):
http://localhost:3000/admin/genspark

Production:
https://pcci-helpdesk.com/admin/genspark
https://helpdesk.votre-entreprise.com/admin/genspark
```

---

### **Méthode 3: Ajout d'un Bouton sur le Dashboard**

**Cette méthode n'est pas encore implémentée, mais voici comment la créer:**

Si vous voulez un accès encore plus rapide depuis le Dashboard, je peux ajouter un bouton.

**Voulez-vous que j'ajoute ce bouton?** Cela ressemblerait à:

```
┌────────────────────────────────────────────┐
│  Dashboard                                 │
├────────────────────────────────────────────┤
│                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │ Nouveau  │  │ Tickets  │  │ 🧠 AI    ││
│  │ Ticket   │  │ Récents  │  │ Analysis ││
│  └──────────┘  └──────────┘  └──────────┘│
│                                            │
└────────────────────────────────────────────┘
```

---

## 🔐 Vérification des Droits

### **Qui Peut Accéder?**

Seuls les utilisateurs avec les rôles suivants peuvent accéder:
- ✅ **Admin** (Administrateur)
- ✅ **Supervisor** (Superviseur)
- ❌ **User** (Utilisateur normal) - PAS D'ACCÈS

### **Comment Vérifier Votre Rôle?**

#### **Méthode Visuelle (Simple)**

1. **Connectez-vous**
2. **Cliquez sur votre avatar** (coin supérieur droit)
3. **Dans le menu, regardez sous votre email**
4. **Vous verrez votre rôle** écrit en petit
   ```
   John Doe
   john.doe@pcci.com
   supervisor  ← Voici votre rôle
   ```

#### **Méthode Base de Données (Technique)**

Si vous avez accès à Supabase:

1. **Ouvrez Supabase Dashboard**
   - URL: https://app.supabase.com
   - Connectez-vous

2. **Sélectionnez votre projet**
   - "pcci-support-hero" ou votre nom de projet

3. **Allez dans "Table Editor"** (menu gauche)

4. **Ouvrez la table "user_roles"**

5. **Cherchez votre ligne**
   - Colonne `user_id`: Votre ID utilisateur
   - Colonne `role`: Doit être `supervisor` ou `admin`

**Capture d'écran de la table:**
```
┌──────────────────────────────┬────────────┬────────────┐
│ user_id                      │ role       │ created_at │
├──────────────────────────────┼────────────┼────────────┤
│ abc123...                    │ admin      │ 2024-10-01 │
│ def456...                    │ supervisor │ 2024-10-05 │
│ ghi789...                    │ user       │ 2024-10-10 │ ← Pas d'accès
└──────────────────────────────┴────────────┴────────────┘
```

---

## 👤 Créer un Compte Superviseur

### **Cas 1: Vous Êtes Administrateur**

**Via l'Interface Web:**

1. **Connectez-vous** comme admin
2. **Allez dans "Gestion des Utilisateurs"**
   - Avatar → "Gestion des Utilisateurs"
3. **Trouvez l'utilisateur** que vous voulez promouvoir
4. **Cliquez sur "Modifier"** ou l'icône ✏️
5. **Changez le rôle** de "user" à "supervisor"
6. **Enregistrez**

**Via Supabase:**

1. **Ouvrez Supabase Dashboard**
2. **Table Editor → user_roles**
3. **Trouvez l'utilisateur** (ou ajoutez une nouvelle ligne)
4. **Modifiez la colonne "role"**:
   - Changez de `user` à `supervisor`
5. **Cliquez sur "Save"**

---

### **Cas 2: Créer un Nouveau Compte Superviseur**

#### **Étape 1: Créer le Compte**

1. **Allez sur la page d'inscription**
   ```
   https://votre-domaine.com/auth
   ```

2. **Remplissez le formulaire:**
   - Nom complet: `Test Superviseur`
   - Email: `superviseur@pcci.com`
   - Mot de passe: `SuperviseurTest123!`
   - PCCI ID: `PCCI-TEST-001`
   - Département: `IT`
   - Téléphone: `+225 01 02 03 04 05`

3. **Cliquez sur "S'inscrire"**

#### **Étape 2: Promouvoir en Superviseur**

**Via Supabase:**

1. **Ouvrez Supabase Dashboard**
2. **Table Editor → profiles**
3. **Trouvez le nouveau compte** (cherchez par email)
4. **Copiez son `id`** (c'est l'UUID, exemple: `abc123-def456-...`)

5. **Allez dans la table "user_roles"**
6. **Cliquez sur "Insert" → "Insert row"**
7. **Remplissez:**
   ```
   user_id: [collez l'ID copié]
   role: supervisor
   ```
8. **Cliquez sur "Save"**

#### **Étape 3: Tester**

1. **Déconnectez-vous**
2. **Reconnectez-vous** avec le compte superviseur
   - Email: `superviseur@pcci.com`
   - Mot de passe: `SuperviseurTest123!`
3. **Cliquez sur votre avatar**
4. **Vérifiez que "Genspark AI Analysis" apparaît**
5. **Cliquez dessus** pour tester

---

### **Cas 3: Script SQL Rapide (Avancé)**

Si vous avez accès à SQL Editor dans Supabase:

```sql
-- 1. Créer un nouveau profil (optionnel, si compte existe déjà)
-- Remplacez les valeurs par les vôtres

-- 2. Ajouter le rôle superviseur
INSERT INTO user_roles (user_id, role)
VALUES (
  'VOTRE_USER_ID_ICI',  -- Remplacez par l'ID de l'utilisateur
  'supervisor'
)
ON CONFLICT (user_id) 
DO UPDATE SET role = 'supervisor';

-- 3. Vérifier
SELECT 
  p.full_name,
  p.email,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE p.email = 'votre-email@pcci.com';
```

---

## 🔧 Dépannage

### **Problème 1: "Accès Refusé"**

**Symptôme:**
```
❌ Message d'erreur: "Accès refusé - Droits superviseur ou admin requis"
❌ Redirection vers /dashboard
```

**Solutions:**

1. **Vérifiez votre rôle**
   - Avatar → Regardez sous votre email
   - Doit afficher "supervisor" ou "admin"

2. **Si rôle = "user"**
   - Contactez un administrateur
   - Demandez une promotion à "supervisor"

3. **Si vous êtes admin**
   - Vérifiez la table `user_roles` dans Supabase
   - Assurez-vous que votre ID a bien le rôle "admin"

---

### **Problème 2: Menu "Genspark AI Analysis" Invisible**

**Symptôme:**
```
❌ L'option n'apparaît pas dans le menu déroulant
```

**Solutions:**

1. **Actualisez la page** (F5 ou Ctrl+R)

2. **Déconnectez-vous et reconnectez-vous**
   - Avatar → Déconnexion
   - Reconnectez-vous

3. **Videz le cache du navigateur**
   ```
   Chrome/Edge: Ctrl + Shift + Delete
   Firefox: Ctrl + Shift + Delete
   Safari: Cmd + Option + E
   ```

4. **Vérifiez que le code est à jour**
   - Si vous êtes sur serveur Ubuntu, faites la mise à jour:
   ```bash
   cd ~/pcci-helpdesk
   git pull origin main
   npm install
   npm run build
   pm2 restart pcci-helpdesk
   ```

---

### **Problème 3: Erreur 404 sur /admin/genspark**

**Symptôme:**
```
❌ Page introuvable
❌ URL: https://votre-domaine.com/admin/genspark
```

**Solutions:**

1. **Vérifiez que le code est déployé**
   ```bash
   # Sur votre serveur Ubuntu
   cd ~/pcci-helpdesk
   git log --oneline -5
   
   # Vous devez voir ce commit:
   # ca76f3a feat: Ajouter l'intégration Genspark AI Analysis
   ```

2. **Si le commit n'est pas là, mettez à jour:**
   ```bash
   git pull origin main
   npm install
   npm run build
   pm2 restart pcci-helpdesk
   ```

3. **Vérifiez les logs d'erreur**
   ```bash
   pm2 logs pcci-helpdesk --err
   ```

---

### **Problème 4: Page Blanche ou Chargement Infini**

**Symptôme:**
```
❌ Page blanche
❌ Ou roue de chargement qui tourne indéfiniment
```

**Solutions:**

1. **Ouvrez la Console du Navigateur**
   ```
   Windows/Linux: F12
   Mac: Cmd + Option + I
   ```

2. **Allez dans l'onglet "Console"**
   - Cherchez les erreurs en rouge

3. **Erreurs courantes:**
   ```
   TypeError: Cannot read property...
   → Rechargez la page (F5)
   
   Network Error: Failed to fetch
   → Vérifiez votre connexion internet
   → Vérifiez que le serveur backend fonctionne
   
   403 Forbidden
   → Vérifiez vos droits d'accès (voir Problème 1)
   ```

4. **Rechargez en vidant le cache**
   ```
   Windows/Linux: Ctrl + Shift + R
   Mac: Cmd + Shift + R
   ```

---

### **Problème 5: "Aucun Ticket à Analyser"**

**Symptôme:**
```
ℹ️ Message: "Aucun ticket à analyser"
ℹ️ Le bouton "Lancer l'analyse" est grisé
```

**Solutions:**

1. **Vérifiez qu'il existe des tickets**
   - Allez sur "Tickets" dans le menu
   - Créez au moins un ticket de test

2. **Créer un ticket de test:**
   ```
   1. Cliquez sur "Nouveau Ticket"
   2. Remplissez:
      - Titre: "Test connexion réseau"
      - Description: "Impossible de se connecter au wifi"
      - Priorité: Haute
   3. Enregistrez
   ```

3. **Retournez sur Genspark**
   - Cliquez sur "Actualiser"
   - Le bouton devrait maintenant être actif

---

## 📞 Support Supplémentaire

### **Besoin d'Aide?**

Si aucune de ces solutions ne fonctionne:

1. **Collectez ces informations:**
   ```
   - Votre rôle: [user / supervisor / admin]
   - Message d'erreur exact: [copier-coller]
   - URL actuelle: [copier depuis la barre d'adresse]
   - Navigateur: [Chrome / Firefox / Safari / Edge]
   - Étapes effectuées: [liste ce que vous avez essayé]
   ```

2. **Créez un rapport de débogage:**
   ```bash
   # Sur votre serveur Ubuntu
   cd ~/pcci-helpdesk
   
   cat > ~/genspark-debug.txt << 'EOF'
   ========================================
   GENSPARK DEBUG REPORT
   ========================================
   
   Date: $(date)
   Commit actuel: $(git log -1 --oneline)
   Status PM2: $(pm2 status)
   
   Derniers logs (20 lignes):
   $(pm2 logs pcci-helpdesk --lines 20 --nostream)
   
   Fichiers Genspark:
   $(ls -la src/pages/GensarkAnalysis.tsx)
   $(ls -la src/types/genspark.ts)
   $(ls -la src/utils/genspark-analyzer.ts)
   ========================================
   EOF
   
   cat ~/genspark-debug.txt
   ```

3. **Envoyez ce rapport** à votre équipe de support

---

## 🎉 Récapitulatif Rapide

### **Pour Accéder à Genspark:**

```
1. ✅ Avoir un compte Superviseur ou Admin
2. ✅ Se connecter à l'application
3. ✅ Cliquer sur Avatar → "🧠 Genspark AI Analysis"
4. ✅ OU aller directement sur /admin/genspark
```

### **Si Problème:**

```
1. Vérifiez votre rôle (doit être supervisor ou admin)
2. Actualisez la page (F5)
3. Videz le cache (Ctrl + Shift + Delete)
4. Vérifiez que le code est à jour (git pull)
5. Consultez ce guide de dépannage
```

---

**Bonne utilisation! 🚀**

Si vous avez d'autres questions, n'hésitez pas à demander!
