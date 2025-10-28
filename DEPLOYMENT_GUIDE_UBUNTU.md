# 🚀 Guide de Mise à Jour - Serveur Ubuntu Existant

## 📋 Table des Matières
1. [Vue d'ensemble](#vue-densemble)
2. [Pré-requis](#pré-requis)
3. [Sauvegarde Complète](#sauvegarde-complète)
4. [Mise à Jour du Code](#mise-à-jour-du-code)
5. [Vérifications Post-Déploiement](#vérifications-post-déploiement)
6. [Rollback en Cas de Problème](#rollback-en-cas-de-problème)
7. [Script d'Automatisation](#script-dautomatisation)

---

## 📖 Vue d'ensemble

Ce guide vous accompagne pour mettre à jour votre application **PCCI Help Desk** déjà déployée sur Ubuntu avec les nouvelles améliorations de sécurité (Phases 1-4).

### ✨ Améliorations Incluses:
- ✅ Protection XSS complète sur toutes les pages
- ✅ Rate limiting sur authentification
- ✅ Validation Zod des entrées
- ✅ Gestion d'erreurs centralisée
- ✅ Mots de passe renforcés
- ✅ Sanitization de toutes les données

### ⚠️ Impact:
- **Temps d'arrêt estimé:** 5-10 minutes
- **Risque:** Faible (avec sauvegarde appropriée)
- **Rollback:** Possible à tout moment

---

## 🔧 Pré-requis

### 1. Accès Serveur
```bash
# Vérifier l'accès SSH
ssh votre_utilisateur@votre_serveur_ip

# Vérifier les permissions sudo
sudo -v
```

### 2. Outils Nécessaires
```bash
# Vérifier Node.js (version 18+)
node --version

# Vérifier npm
npm --version

# Vérifier Git
git --version

# Vérifier PM2 (si utilisé)
pm2 --version
```

### 3. Variables d'Environnement
Assurez-vous que votre fichier `.env` contient:
```bash
# Supabase
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon

# Autres configurations...
```

---

## 💾 Sauvegarde Complète

### **CRITIQUE: Ne sautez JAMAIS cette étape!** ⚠️

### 1. Créer un Répertoire de Sauvegarde

```bash
# Se connecter au serveur
ssh votre_utilisateur@votre_serveur_ip

# Créer un répertoire de sauvegarde avec date
BACKUP_DIR="$HOME/backups/pcci-helpdesk-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "Backup créé dans: $BACKUP_DIR"
```

### 2. Sauvegarder l'Application Actuelle

```bash
# Supposons que votre app est dans ~/pcci-helpdesk
APP_DIR="$HOME/pcci-helpdesk"  # Ajustez selon votre chemin

# Sauvegarder le code source complet
echo "📦 Sauvegarde du code source..."
cp -r "$APP_DIR" "$BACKUP_DIR/pcci-helpdesk-src"

# Sauvegarder les variables d'environnement
echo "🔑 Sauvegarde des variables d'environnement..."
cp "$APP_DIR/.env" "$BACKUP_DIR/.env.backup" 2>/dev/null || echo "Pas de fichier .env trouvé"

# Sauvegarder la configuration PM2 (si utilisé)
echo "⚙️ Sauvegarde de la configuration PM2..."
pm2 save
cp ~/.pm2/dump.pm2 "$BACKUP_DIR/pm2-dump.backup" 2>/dev/null || echo "PM2 non utilisé"

# Sauvegarder la configuration Nginx (si utilisé)
echo "🌐 Sauvegarde de la configuration Nginx..."
sudo cp /etc/nginx/sites-available/pcci-helpdesk "$BACKUP_DIR/nginx.conf.backup" 2>/dev/null || echo "Nginx non configuré"

# Créer un résumé de la sauvegarde
echo "📝 Création du résumé..."
cat > "$BACKUP_DIR/BACKUP_INFO.txt" << EOF
===========================================
SAUVEGARDE PCCI HELP DESK
===========================================
Date: $(date)
Serveur: $(hostname)
Utilisateur: $(whoami)
Répertoire application: $APP_DIR
Commit actuel: $(cd "$APP_DIR" && git rev-parse HEAD)
Branch actuelle: $(cd "$APP_DIR" && git rev-parse --abbrev-ref HEAD)
===========================================
EOF

echo "✅ Sauvegarde terminée: $BACKUP_DIR"
```

### 3. Vérifier la Sauvegarde

```bash
# Lister le contenu de la sauvegarde
ls -lah "$BACKUP_DIR"

# Afficher le résumé
cat "$BACKUP_DIR/BACKUP_INFO.txt"
```

---

## 🔄 Mise à Jour du Code

### Méthode 1: Mise à Jour Manuelle (Recommandée pour Premier Déploiement)

#### Étape 1: Arrêter l'Application

```bash
# Si vous utilisez PM2
pm2 stop pcci-helpdesk

# Si vous utilisez systemd
sudo systemctl stop pcci-helpdesk

# Si vous utilisez un processus direct
# Trouvez le PID et tuez-le
ps aux | grep node
# kill <PID>
```

#### Étape 2: Récupérer les Nouvelles Modifications

```bash
# Aller dans le répertoire de l'application
cd ~/pcci-helpdesk  # Ajustez selon votre chemin

# Vérifier l'état actuel
git status
git log -1

# Récupérer les dernières modifications depuis GitHub
git fetch origin main

# Voir les changements qui seront appliqués
git log HEAD..origin/main --oneline

# Appliquer les modifications
git pull origin main

# Vérifier le nouveau commit
git log -1
```

#### Étape 3: Installer les Nouvelles Dépendances

```bash
# Installer/mettre à jour les dépendances
npm install

# Vérifier qu'il n'y a pas d'erreurs
echo $?  # Devrait retourner 0
```

#### Étape 4: Reconstruire l'Application

```bash
# Build de production
npm run build

# Vérifier que le build a réussi
ls -la dist/  # Le dossier dist/ devrait contenir les fichiers buildés
```

#### Étape 5: Redémarrer l'Application

```bash
# Si vous utilisez PM2
pm2 restart pcci-helpdesk
pm2 save

# Si vous utilisez systemd
sudo systemctl restart pcci-helpdesk

# Si vous utilisez un processus direct
# cd ~/pcci-helpdesk && npm run preview &
```

#### Étape 6: Vérifier que l'Application Démarre

```bash
# Avec PM2
pm2 status
pm2 logs pcci-helpdesk --lines 50

# Avec systemd
sudo systemctl status pcci-helpdesk
sudo journalctl -u pcci-helpdesk -n 50

# Vérifier que le port est en écoute (exemple: port 3000)
sudo netstat -tlnp | grep :3000
```

---

### Méthode 2: Script Automatisé (Pour Déploiements Futurs)

Utilisez le script fourni ci-dessous (section [Script d'Automatisation](#script-dautomatisation))

---

## ✅ Vérifications Post-Déploiement

### 1. Tests de Santé de Base

```bash
# Vérifier que l'application répond
curl -I http://localhost:3000  # Ajustez le port

# Devrait retourner HTTP 200 ou 301/302
```

### 2. Tests Fonctionnels Critiques

#### Via Navigateur:

1. **Page de Connexion**
   - [ ] Ouvrir `https://votre-domaine.com/login`
   - [ ] Vérifier que la page charge correctement
   - [ ] Essayer de se connecter avec des identifiants valides
   - [ ] Vérifier le rate limiting (5 tentatives max)

2. **Tableau de Bord**
   - [ ] Vérifier que le dashboard s'affiche après connexion
   - [ ] Vérifier que les tickets s'affichent correctement
   - [ ] Vérifier que les caractères spéciaux sont bien échappés (XSS protection)

3. **Création de Ticket**
   - [ ] Créer un nouveau ticket avec contenu normal
   - [ ] Essayer de créer un ticket avec `<script>alert('XSS')</script>` dans le titre
   - [ ] Vérifier que le script est échappé et ne s'exécute pas

4. **Pages Admin** (si vous avez les droits)
   - [ ] Ouvrir `/admin/users`
   - [ ] Vérifier que la liste des utilisateurs s'affiche
   - [ ] Essayer de changer un mot de passe (vérifier exigence 8+ caractères)

5. **Audit Logs** (superviseur/admin)
   - [ ] Ouvrir `/admin/audit-logs`
   - [ ] Vérifier que les logs s'affichent correctement
   - [ ] Vérifier que le contenu est sécurisé (pas de scripts exécutables)

### 3. Tests de Sécurité

#### Test XSS Protection:
```bash
# Test via curl (à adapter selon votre API)
curl -X POST https://votre-domaine.com/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{"title":"<script>alert(\"XSS\")</script>","description":"Test"}'

# Vérifier dans l'interface que le script est échappé
```

#### Test Rate Limiting:
```bash
# Essayer 6 connexions rapides (devrait bloquer la 6ème)
for i in {1..6}; do
  echo "Tentative $i"
  curl -X POST https://votre-domaine.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done
```

### 4. Surveillance des Logs

```bash
# Avec PM2
pm2 logs pcci-helpdesk --lines 100

# Avec systemd
sudo journalctl -u pcci-helpdesk -f

# Logs Nginx (si applicable)
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 5. Vérification des Performances

```bash
# Vérifier l'utilisation CPU/Mémoire
pm2 monit

# Ou avec top
top -p $(pgrep -f "pcci-helpdesk")

# Vérifier les connexions
ss -tlnp | grep node
```

---

## 🔙 Rollback en Cas de Problème

### Si Quelque Chose Ne Fonctionne Pas:

#### Option 1: Rollback Git Rapide

```bash
# Arrêter l'application
pm2 stop pcci-helpdesk

# Aller dans le répertoire
cd ~/pcci-helpdesk

# Trouver le dernier commit stable
git log --oneline -10

# Revenir au commit précédent (remplacez <commit-hash>)
git reset --hard <commit-hash-avant-update>

# Reconstruire
npm install
npm run build

# Redémarrer
pm2 restart pcci-helpdesk
```

#### Option 2: Restauration Complète depuis Sauvegarde

```bash
# Arrêter l'application
pm2 stop pcci-helpdesk

# Trouver votre sauvegarde
ls -lh ~/backups/

# Restaurer le code source
BACKUP_DIR="$HOME/backups/pcci-helpdesk-YYYYMMDD-HHMMSS"  # Ajustez
rm -rf ~/pcci-helpdesk
cp -r "$BACKUP_DIR/pcci-helpdesk-src" ~/pcci-helpdesk

# Restaurer le .env
cp "$BACKUP_DIR/.env.backup" ~/pcci-helpdesk/.env

# Reconstruire
cd ~/pcci-helpdesk
npm install
npm run build

# Redémarrer
pm2 restart pcci-helpdesk
```

#### Option 3: Restauration PM2

```bash
# Si vous avez sauvegardé la config PM2
pm2 kill
cp "$BACKUP_DIR/pm2-dump.backup" ~/.pm2/dump.pm2
pm2 resurrect
```

---

## 🤖 Script d'Automatisation

Créez ce script pour les futurs déploiements:

### Créer le Script

```bash
# Créer le fichier
cat > ~/deploy-pcci-helpdesk.sh << 'SCRIPT_EOF'
#!/bin/bash

#########################################
# Script de Déploiement PCCI Help Desk
# Version: 1.0
# Date: 2024
#########################################

set -e  # Arrêter en cas d'erreur

# Configuration
APP_NAME="pcci-helpdesk"
APP_DIR="$HOME/pcci-helpdesk"  # Ajustez selon votre installation
BACKUP_DIR="$HOME/backups/${APP_NAME}-$(date +%Y%m%d-%H%M%S)"
PM2_APP_NAME="pcci-helpdesk"  # Nom de l'app dans PM2

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonctions d'affichage
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Vérifications préliminaires
info "🔍 Vérification des pré-requis..."

# Vérifier que le répertoire existe
[ ! -d "$APP_DIR" ] && error "Répertoire $APP_DIR n'existe pas!"

# Vérifier Git
command -v git >/dev/null 2>&1 || error "Git n'est pas installé!"

# Vérifier Node.js
command -v node >/dev/null 2>&1 || error "Node.js n'est pas installé!"

# Vérifier npm
command -v npm >/dev/null 2>&1 || error "npm n'est pas installé!"

info "✅ Tous les pré-requis sont satisfaits"

# Créer la sauvegarde
info "💾 Création de la sauvegarde dans: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Sauvegarder le code
info "📦 Sauvegarde du code source..."
cp -r "$APP_DIR" "$BACKUP_DIR/${APP_NAME}-src"

# Sauvegarder .env
if [ -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env" "$BACKUP_DIR/.env.backup"
    info "🔑 Fichier .env sauvegardé"
fi

# Sauvegarder info Git
cd "$APP_DIR"
git rev-parse HEAD > "$BACKUP_DIR/git-commit.txt"
git rev-parse --abbrev-ref HEAD > "$BACKUP_DIR/git-branch.txt"

info "✅ Sauvegarde terminée: $BACKUP_DIR"

# Arrêter l'application
info "🛑 Arrêt de l'application..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 stop "$PM2_APP_NAME" || warn "PM2 app non trouvée ou déjà arrêtée"
else
    warn "PM2 non installé, assurez-vous d'arrêter l'app manuellement si nécessaire"
fi

# Récupérer les modifications
info "📥 Récupération des modifications depuis GitHub..."
cd "$APP_DIR"

# Afficher les changements
info "Changements à appliquer:"
git fetch origin main
git log HEAD..origin/main --oneline || info "Aucun changement"

# Appliquer les modifications
info "🔄 Application des modifications..."
git pull origin main || error "Échec du git pull!"

# Installer les dépendances
info "📦 Installation des dépendances..."
npm install || error "Échec de npm install!"

# Build
info "🔨 Construction de l'application..."
npm run build || error "Échec du build!"

# Redémarrer l'application
info "🚀 Redémarrage de l'application..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 restart "$PM2_APP_NAME" || pm2 start ecosystem.config.js
    pm2 save
    
    # Attendre que l'app démarre
    sleep 5
    
    # Vérifier le statut
    pm2 status "$PM2_APP_NAME"
else
    warn "PM2 non installé - veuillez redémarrer l'application manuellement"
fi

# Tests de santé
info "🏥 Tests de santé..."
sleep 3

# Test HTTP (ajustez le port selon votre config)
if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    info "✅ Application répond correctement"
else
    warn "⚠️  Application ne répond pas sur le port 3000 - vérifiez manuellement"
fi

# Résumé
echo ""
echo "========================================"
echo "✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS!"
echo "========================================"
echo "📦 Sauvegarde: $BACKUP_DIR"
echo "📋 Commit: $(cat $BACKUP_DIR/git-commit.txt)"
echo "🌿 Branch: $(cat $BACKUP_DIR/git-branch.txt)"
echo "🕒 Date: $(date)"
echo ""
echo "⚠️  PROCHAINES ÉTAPES:"
echo "1. Vérifier les logs: pm2 logs $PM2_APP_NAME"
echo "2. Tester l'application dans le navigateur"
echo "3. Vérifier les fonctionnalités critiques"
echo ""
echo "🔙 En cas de problème:"
echo "   Restaurer: cp -r $BACKUP_DIR/${APP_NAME}-src/* $APP_DIR/"
echo "========================================"

SCRIPT_EOF

# Rendre le script exécutable
chmod +x ~/deploy-pcci-helpdesk.sh

info "✅ Script créé: ~/deploy-pcci-helpdesk.sh"
```

### Utiliser le Script

```bash
# Pour les futurs déploiements, simplement exécuter:
~/deploy-pcci-helpdesk.sh

# Ou avec sudo si nécessaire
sudo ~/deploy-pcci-helpdesk.sh
```

---

## 📝 Checklist de Déploiement

Imprimez et cochez chaque étape:

### Avant Déploiement:
- [ ] Sauvegarde créée
- [ ] Variables d'environnement vérifiées
- [ ] Accès serveur vérifié
- [ ] Communication aux utilisateurs (maintenance)

### Pendant Déploiement:
- [ ] Application arrêtée
- [ ] Code mis à jour (git pull)
- [ ] Dépendances installées (npm install)
- [ ] Build réussi (npm run build)
- [ ] Application redémarrée

### Après Déploiement:
- [ ] Application répond (test HTTP)
- [ ] Page login accessible
- [ ] Connexion fonctionne
- [ ] Dashboard s'affiche
- [ ] Création ticket fonctionne
- [ ] Protection XSS active (test avec `<script>`)
- [ ] Rate limiting actif (test 6 tentatives)
- [ ] Pages admin accessibles
- [ ] Logs ne montrent pas d'erreurs
- [ ] Performance normale (CPU/RAM)

### Si Problème:
- [ ] Rollback effectué
- [ ] Application restaurée depuis backup
- [ ] Logs analysés
- [ ] Problème documenté

---

## 🆘 Support et Dépannage

### Problèmes Courants

#### 1. "Cannot find module" après npm install

```bash
# Supprimer node_modules et réinstaller
rm -rf node_modules package-lock.json
npm install
```

#### 2. Build échoue

```bash
# Vérifier les erreurs de syntaxe
npm run build -- --verbose

# Vérifier la version Node.js
node --version  # Devrait être 18+
```

#### 3. PM2 ne redémarre pas

```bash
# Redémarrer complètement PM2
pm2 kill
pm2 start ecosystem.config.js
pm2 save
```

#### 4. Port déjà utilisé

```bash
# Trouver le processus utilisant le port
sudo lsof -i :3000

# Tuer le processus
kill -9 <PID>
```

#### 5. Permissions insuffisantes

```bash
# Vérifier les permissions du répertoire
ls -la ~/pcci-helpdesk

# Corriger les permissions si nécessaire
sudo chown -R $USER:$USER ~/pcci-helpdesk
```

---

## 📞 Contact

En cas de problème avec le déploiement:
1. Vérifiez les logs: `pm2 logs pcci-helpdesk`
2. Consultez ce guide
3. Effectuez un rollback si nécessaire
4. Contactez le support technique

---

## 📚 Ressources Additionnelles

- [Documentation Phases 1-4](./PHASE_4_IMPLEMENTATION_SUMMARY.md)
- [GitHub Repository](https://github.com/mwrhv/pcci-support-hero)
- [Documentation PM2](https://pm2.keymetrics.io/)
- [Documentation Nginx](https://nginx.org/en/docs/)

---

**Version:** 1.0  
**Dernière mise à jour:** 2024-10-28  
**Auteur:** PCCI Support Hero Team
