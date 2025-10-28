# 🚀 Guide de Mise à Jour de Votre Serveur Ubuntu

## 🎯 Objectif

Mettre à jour votre application **PCCI Help Desk** déjà déployée sur Ubuntu avec les **nouvelles améliorations de sécurité** (Phases 1-4) depuis le repository GitHub.

---

## 📋 Ce Que Vous Avez Maintenant

✅ Application PCCI Help Desk déployée sur serveur Ubuntu  
✅ Code source dans un répertoire (ex: `/home/user/pcci-helpdesk`)  
✅ Application tournant avec PM2 ou systemd  
✅ Repository GitHub: https://github.com/mwrhv/pcci-support-hero

---

## 🎁 Ce Que Vous Allez Recevoir

Après la mise à jour, votre application aura:

✅ **Protection XSS complète** sur toutes les pages  
✅ **Rate Limiting** contre les attaques brute force  
✅ **Validation Zod** de toutes les entrées  
✅ **Mots de passe renforcés** (8+ caractères)  
✅ **Gestion d'erreurs centralisée**  
✅ **Sanitization** de toutes les données  
✅ **18/18 pages sécurisées** (100% de couverture)

---

## ⚡ OPTION 1: Déploiement Automatique (RECOMMANDÉ)

### Étapes Simples (5 minutes)

#### 1. Connectez-vous à Votre Serveur

```bash
ssh votre_utilisateur@adresse_ip_serveur

# Exemple:
# ssh ubuntu@192.168.1.100
# ou
# ssh root@votre-domaine.com
```

#### 2. Téléchargez le Script de Déploiement

```bash
cd ~
wget https://raw.githubusercontent.com/mwrhv/pcci-support-hero/main/deploy-to-ubuntu.sh
chmod +x deploy-to-ubuntu.sh
```

#### 3. Configurez Vos Paramètres (IMPORTANT!)

**Éditez le script pour vos chemins:**

```bash
nano deploy-to-ubuntu.sh
```

**Modifiez ces 3 lignes au début du fichier:**

```bash
# TROUVEZ CES LIGNES (lignes 11-13) ET MODIFIEZ-LES:

APP_DIR="$HOME/pcci-helpdesk"        # ← Remplacez par le chemin de votre app
PM2_APP_NAME="pcci-helpdesk"         # ← Remplacez par le nom PM2 de votre app
APP_PORT="${APP_PORT:-3000}"          # ← Remplacez par le port de votre app
```

**Exemples de Configuration:**

```bash
# Si votre app est dans /var/www/helpdesk:
APP_DIR="/var/www/helpdesk"

# Si votre app PM2 s'appelle "support-hero":
PM2_APP_NAME="support-hero"

# Si votre app tourne sur le port 8080:
APP_PORT="${APP_PORT:-8080}"
```

**Sauvegardez et quittez:** `Ctrl+X`, puis `Y`, puis `Enter`

#### 4. Exécutez le Script

```bash
./deploy-to-ubuntu.sh
```

**Le script va:**
1. ✅ Vérifier les pré-requis (Node.js, Git, npm)
2. ✅ Créer une sauvegarde complète
3. ✅ Arrêter l'application
4. ✅ Récupérer les modifications depuis GitHub
5. ✅ Installer les dépendances
6. ✅ Reconstruire l'application
7. ✅ Redémarrer l'application
8. ✅ Exécuter les tests de santé

**Vous verrez:**
```
========================================
   PCCI Help Desk - Déploiement
========================================

[INFO] 🔍 Étape 1/9 - Vérification des pré-requis...
[SUCCESS] ✅ Tous les pré-requis sont satisfaits

[INFO] 💾 Étape 2/9 - Création de la sauvegarde...
...
[SUCCESS] ✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS!
```

#### 5. Vérifiez Que Tout Fonctionne

Le script vous donnera un résumé final. Vérifiez:

```bash
# Voir le statut PM2
pm2 status

# Voir les logs
pm2 logs pcci-helpdesk --lines 30

# Tester la connexion HTTP
curl http://localhost:3000  # Ajustez le port
```

**✅ C'EST TOUT! Votre application est mise à jour!**

---

## 🔧 OPTION 2: Déploiement Manuel

### Si Vous Préférez les Commandes Manuelles

#### 1. Connectez-vous à Votre Serveur

```bash
ssh votre_utilisateur@adresse_ip_serveur
```

#### 2. Créez une Sauvegarde

```bash
# Trouvez le répertoire de votre app
cd /chemin/vers/votre/pcci-helpdesk  # Ajustez!

# Créez une sauvegarde avec la date
BACKUP_DIR="$HOME/backups/pcci-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r . "$BACKUP_DIR/"
echo "Sauvegarde créée: $BACKUP_DIR"
```

#### 3. Arrêtez l'Application

```bash
# Avec PM2
pm2 stop pcci-helpdesk  # Remplacez par votre nom PM2

# OU avec systemd
sudo systemctl stop pcci-helpdesk

# OU trouvez et tuez le processus Node.js
ps aux | grep node
kill <PID>
```

#### 4. Récupérez les Modifications

```bash
# Allez dans le répertoire de l'app
cd /chemin/vers/votre/pcci-helpdesk

# Vérifiez l'état actuel
git status

# Récupérez les modifications
git fetch origin main
git pull origin main
```

#### 5. Installez les Dépendances

```bash
npm install
```

#### 6. Reconstruisez l'Application

```bash
npm run build
```

#### 7. Redémarrez l'Application

```bash
# Avec PM2
pm2 restart pcci-helpdesk
pm2 save

# OU avec systemd
sudo systemctl restart pcci-helpdesk
```

#### 8. Vérifiez le Déploiement

```bash
# Vérifiez le statut
pm2 status

# Vérifiez les logs
pm2 logs pcci-helpdesk --lines 50

# Testez la connexion
curl http://localhost:3000
```

---

## ✅ Vérifications Post-Déploiement

### 1. Tests dans le Terminal

```bash
# PM2 doit afficher "online"
pm2 status

# Logs ne doivent pas montrer d'erreurs
pm2 logs pcci-helpdesk

# Port doit être en écoute
sudo netstat -tlnp | grep :3000  # Ajustez le port
```

### 2. Tests dans le Navigateur

Ouvrez votre application et testez:

#### Test 1: Page de Connexion
- [ ] Allez sur: `https://votre-domaine.com/login`
- [ ] Connectez-vous avec un compte valide
- [ ] ✅ La connexion doit fonctionner

#### Test 2: Rate Limiting (Protection Brute Force)
- [ ] Sur la page login, essayez 6 connexions avec un mauvais mot de passe
- [ ] ✅ Après 5 tentatives, vous devez être bloqué pour 5 minutes

#### Test 3: Protection XSS
- [ ] Créez un nouveau ticket
- [ ] Dans le titre, écrivez: `<script>alert('XSS')</script>`
- [ ] Enregistrez le ticket
- [ ] ✅ Le script doit être affiché comme texte (pas exécuté)
- [ ] ✅ Pas de popup d'alerte JavaScript

#### Test 4: Mots de Passe Forts (Pages Admin)
- [ ] Allez sur: `https://votre-domaine.com/admin/users`
- [ ] Essayez de changer un mot de passe avec "123456"
- [ ] ✅ Doit refuser (minimum 8 caractères + maj + min + chiffre)
- [ ] Changez avec "Password123"
- [ ] ✅ Doit accepter

#### Test 5: Tableau de Bord
- [ ] Allez sur: `https://votre-domaine.com/dashboard`
- [ ] ✅ Les statistiques s'affichent correctement
- [ ] ✅ Les tickets récents s'affichent

#### Test 6: Audit Logs (Admin/Superviseur)
- [ ] Allez sur: `https://votre-domaine.com/admin/audit-logs`
- [ ] ✅ Les logs s'affichent sans erreur
- [ ] ✅ Pas de scripts malveillants visibles

**SI TOUS LES TESTS PASSENT ✅ → DÉPLOIEMENT RÉUSSI!**

---

## 🔙 En Cas de Problème (Rollback)

### Si Quelque Chose Ne Fonctionne Pas

#### Rollback Rapide (Recommandé)

```bash
# 1. Arrêtez l'app
pm2 stop pcci-helpdesk

# 2. Trouvez votre sauvegarde
ls -lh ~/backups/

# 3. Restaurez (remplacez YYYYMMDD-HHMMSS par votre date)
BACKUP_DIR="$HOME/backups/pcci-backup-YYYYMMDD-HHMMSS"
cd /chemin/vers/votre/pcci-helpdesk
rm -rf * .[^.]*  # Attention: efface tout dans le répertoire actuel!
cp -r "$BACKUP_DIR/"* .
cp -r "$BACKUP_DIR/."* . 2>/dev/null || true

# 4. Redémarrez
pm2 restart pcci-helpdesk
```

#### Rollback Git (Alternative)

```bash
# 1. Voir les commits récents
cd /chemin/vers/votre/pcci-helpdesk
git log --oneline -10

# 2. Revenir au commit précédent (avant la mise à jour)
git reset --hard HEAD~1

# 3. Rebuild
npm install
npm run build

# 4. Redémarrer
pm2 restart pcci-helpdesk
```

---

## 🆘 Dépannage

### Problème 1: "Permission denied"

```bash
# Utilisez sudo
sudo ./deploy-to-ubuntu.sh

# Ou changez les permissions
sudo chown -R $USER:$USER /chemin/vers/pcci-helpdesk
```

### Problème 2: "npm install" échoue

```bash
# Nettoyez et réinstallez
cd /chemin/vers/pcci-helpdesk
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Problème 3: "npm run build" échoue

```bash
# Vérifiez la version Node.js (doit être 18+)
node --version

# Si version < 18, mettez à jour Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Problème 4: PM2 ne démarre pas l'app

```bash
# Redémarrez complètement PM2
pm2 kill
cd /chemin/vers/pcci-helpdesk

# Si vous avez ecosystem.config.js
pm2 start ecosystem.config.js

# Sinon, démarrage manuel
pm2 start npm --name "pcci-helpdesk" -- run preview

pm2 save
```

### Problème 5: Application ne répond pas

```bash
# Vérifiez les logs
pm2 logs pcci-helpdesk --err

# Vérifiez le port
sudo netstat -tlnp | grep node

# Vérifiez le fichier .env
cat /chemin/vers/pcci-helpdesk/.env

# Redémarrez Nginx (si utilisé)
sudo systemctl restart nginx
```

---

## 📞 Besoin d'Aide?

### Informations à Collecter

Si vous avez besoin d'aide, collectez ces informations:

```bash
# Créez un rapport de débogage
cat > ~/debug-report.txt << 'EOF'
========================================
PCCI HELP DESK - RAPPORT DE DÉBOGAGE
========================================

Date: $(date)
Hostname: $(hostname)
User: $(whoami)

--- Versions ---
Node: $(node -v)
npm: $(npm -v)
PM2: $(pm2 -v)

--- Git Status ---
$(cd /chemin/vers/pcci-helpdesk && git log -1 --oneline)
$(cd /chemin/vers/pcci-helpdesk && git status)

--- PM2 Status ---
$(pm2 status)

--- Derniers Logs (30 lignes) ---
$(pm2 logs pcci-helpdesk --lines 30 --nostream)

--- Ports en Écoute ---
$(sudo netstat -tlnp | grep node)

--- Espace Disque ---
$(df -h)

--- Mémoire ---
$(free -h)

========================================
EOF

# Affichez le rapport
cat ~/debug-report.txt
```

Envoyez ce rapport à votre équipe de support.

---

## 📚 Documentation Complète

Pour plus de détails, consultez:

- **Guide Complet**: [DEPLOYMENT_GUIDE_UBUNTU.md](https://github.com/mwrhv/pcci-support-hero/blob/main/DEPLOYMENT_GUIDE_UBUNTU.md)
- **Référence Rapide**: [QUICK_DEPLOYMENT_REFERENCE.md](https://github.com/mwrhv/pcci-support-hero/blob/main/QUICK_DEPLOYMENT_REFERENCE.md)
- **Améliorations Phase 4**: [PHASE_4_IMPLEMENTATION_SUMMARY.md](https://github.com/mwrhv/pcci-support-hero/blob/main/PHASE_4_IMPLEMENTATION_SUMMARY.md)
- **Repository GitHub**: https://github.com/mwrhv/pcci-support-hero

---

## 🎉 Résumé

### ✅ Avec le Script Automatique:
1. Télécharger le script
2. Configurer vos chemins (APP_DIR, PM2_APP_NAME, APP_PORT)
3. Exécuter `./deploy-to-ubuntu.sh`
4. Vérifier que tout fonctionne
5. **Temps total: ~5 minutes**

### ✅ Avec les Commandes Manuelles:
1. Faire une sauvegarde
2. Arrêter l'app
3. `git pull origin main`
4. `npm install`
5. `npm run build`
6. Redémarrer l'app
7. Vérifier que tout fonctionne
8. **Temps total: ~10 minutes**

---

**🔐 Après la Mise à Jour, Votre Application Sera 100% Sécurisée!**

- ✅ Protection contre XSS
- ✅ Protection contre brute force
- ✅ Validation de toutes les entrées
- ✅ Mots de passe renforcés
- ✅ Gestion d'erreurs robuste

**Bonne mise à jour! 🚀**
