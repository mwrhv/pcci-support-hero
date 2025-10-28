#!/bin/bash

#########################################
# Script de Déploiement PCCI Help Desk
# Usage: ./deploy-to-ubuntu.sh
# Version: 1.0
# Date: 2024-10-28
#########################################

set -e  # Arrêter en cas d'erreur

# Configuration par défaut (à personnaliser)
APP_NAME="pcci-helpdesk"
APP_DIR="$HOME/pcci-helpdesk"
BACKUP_DIR="$HOME/backups/${APP_NAME}-$(date +%Y%m%d-%H%M%S)"
PM2_APP_NAME="pcci-helpdesk"
APP_PORT="${APP_PORT:-3000}"  # Port par défaut: 3000

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Bannière
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   PCCI Help Desk - Déploiement${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

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

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Demander confirmation
confirm() {
    read -p "$(echo -e ${YELLOW}[?]${NC} $1 [y/N]: )" response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Afficher l'utilisation
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --app-dir PATH      Chemin vers l'application (défaut: $APP_DIR)"
    echo "  --pm2-name NAME     Nom de l'app PM2 (défaut: $PM2_APP_NAME)"
    echo "  --port PORT         Port de l'application (défaut: $APP_PORT)"
    echo "  --skip-backup       Sauter la sauvegarde (NON RECOMMANDÉ)"
    echo "  --skip-tests        Sauter les tests post-déploiement"
    echo "  -h, --help          Afficher cette aide"
    echo ""
    exit 0
}

# Parser les arguments
SKIP_BACKUP=false
SKIP_TESTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --app-dir)
            APP_DIR="$2"
            shift 2
            ;;
        --pm2-name)
            PM2_APP_NAME="$2"
            shift 2
            ;;
        --port)
            APP_PORT="$2"
            shift 2
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            error "Option inconnue: $1"
            ;;
    esac
done

# Afficher la configuration
info "Configuration du déploiement:"
echo "  - Répertoire app: $APP_DIR"
echo "  - Nom PM2: $PM2_APP_NAME"
echo "  - Port: $APP_PORT"
echo "  - Répertoire backup: $BACKUP_DIR"
echo ""

# Demander confirmation
if ! confirm "Continuer avec cette configuration?"; then
    info "Déploiement annulé"
    exit 0
fi

echo ""

#########################################
# 1. VÉRIFICATIONS PRÉLIMINAIRES
#########################################

info "🔍 Étape 1/9 - Vérification des pré-requis..."

# Vérifier que le répertoire existe
if [ ! -d "$APP_DIR" ]; then
    error "Le répertoire $APP_DIR n'existe pas! Veuillez le créer d'abord."
fi

# Vérifier Git
if ! command -v git >/dev/null 2>&1; then
    error "Git n'est pas installé! Installation: sudo apt install git"
fi

# Vérifier Node.js
if ! command -v node >/dev/null 2>&1; then
    error "Node.js n'est pas installé! Installation: https://nodejs.org/"
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js version 18+ requise! Version actuelle: $(node -v)"
fi

# Vérifier npm
if ! command -v npm >/dev/null 2>&1; then
    error "npm n'est pas installé!"
fi

# Vérifier si PM2 est installé
PM2_INSTALLED=false
if command -v pm2 >/dev/null 2>&1; then
    PM2_INSTALLED=true
    info "PM2 détecté - sera utilisé pour gérer l'application"
else
    warn "PM2 non installé - gestion manuelle de l'application requise"
fi

success "✅ Tous les pré-requis sont satisfaits"
echo ""

#########################################
# 2. SAUVEGARDE
#########################################

if [ "$SKIP_BACKUP" = false ]; then
    info "💾 Étape 2/9 - Création de la sauvegarde..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Sauvegarder le code
    info "📦 Sauvegarde du code source..."
    cp -r "$APP_DIR" "$BACKUP_DIR/${APP_NAME}-src" 2>/dev/null || true
    
    # Sauvegarder .env
    if [ -f "$APP_DIR/.env" ]; then
        cp "$APP_DIR/.env" "$BACKUP_DIR/.env.backup"
        info "🔑 Fichier .env sauvegardé"
    else
        warn "Aucun fichier .env trouvé"
    fi
    
    # Sauvegarder PM2
    if [ "$PM2_INSTALLED" = true ]; then
        pm2 save 2>/dev/null || true
        if [ -f "$HOME/.pm2/dump.pm2" ]; then
            cp "$HOME/.pm2/dump.pm2" "$BACKUP_DIR/pm2-dump.backup"
            info "⚙️  Configuration PM2 sauvegardée"
        fi
    fi
    
    # Sauvegarder info Git
    cd "$APP_DIR"
    git rev-parse HEAD > "$BACKUP_DIR/git-commit.txt" 2>/dev/null || echo "unknown" > "$BACKUP_DIR/git-commit.txt"
    git rev-parse --abbrev-ref HEAD > "$BACKUP_DIR/git-branch.txt" 2>/dev/null || echo "unknown" > "$BACKUP_DIR/git-branch.txt"
    
    # Créer un fichier d'info
    cat > "$BACKUP_DIR/BACKUP_INFO.txt" << EOF
===========================================
SAUVEGARDE PCCI HELP DESK
===========================================
Date: $(date)
Hostname: $(hostname)
User: $(whoami)
App Dir: $APP_DIR
Git Commit: $(cat "$BACKUP_DIR/git-commit.txt")
Git Branch: $(cat "$BACKUP_DIR/git-branch.txt")
Node Version: $(node -v)
npm Version: $(npm -v)
===========================================
EOF
    
    success "✅ Sauvegarde créée: $BACKUP_DIR"
    echo ""
else
    warn "⚠️  Étape 2/9 - Sauvegarde IGNORÉE (--skip-backup)"
    echo ""
fi

#########################################
# 3. ARRÊT DE L'APPLICATION
#########################################

info "🛑 Étape 3/9 - Arrêt de l'application..."

if [ "$PM2_INSTALLED" = true ]; then
    # Vérifier si l'app PM2 existe
    if pm2 list | grep -q "$PM2_APP_NAME"; then
        pm2 stop "$PM2_APP_NAME" 2>/dev/null || true
        success "✅ Application PM2 arrêtée"
    else
        warn "Application PM2 '$PM2_APP_NAME' non trouvée"
    fi
else
    warn "PM2 non installé - assurez-vous d'arrêter l'application manuellement"
fi

echo ""

#########################################
# 4. RÉCUPÉRATION DES MODIFICATIONS
#########################################

info "📥 Étape 4/9 - Récupération des modifications..."

cd "$APP_DIR"

# Vérifier l'état Git
if [ -d ".git" ]; then
    info "État Git actuel:"
    git status --short
    echo ""
    
    # Fetch depuis GitHub
    info "Récupération depuis GitHub..."
    git fetch origin main
    
    # Afficher les changements
    info "Changements disponibles:"
    CHANGES=$(git log HEAD..origin/main --oneline | wc -l)
    if [ "$CHANGES" -gt 0 ]; then
        git log HEAD..origin/main --oneline --color=always
        echo ""
        
        if ! confirm "Appliquer ces $CHANGES changements?"; then
            error "Déploiement annulé par l'utilisateur"
        fi
        
        # Pull
        info "Application des modifications..."
        git pull origin main || error "Échec du git pull!"
        success "✅ Modifications appliquées"
    else
        info "Aucune modification à appliquer (déjà à jour)"
    fi
else
    error "Le répertoire n'est pas un dépôt Git!"
fi

echo ""

#########################################
# 5. INSTALLATION DES DÉPENDANCES
#########################################

info "📦 Étape 5/9 - Installation des dépendances..."

# Vérifier si package.json a changé
if git diff HEAD@{1} HEAD --name-only | grep -q "package.json"; then
    info "package.json a changé - installation complète..."
    npm install || error "Échec de npm install!"
else
    info "package.json inchangé - installation rapide..."
    npm install --prefer-offline --no-audit || error "Échec de npm install!"
fi

success "✅ Dépendances installées"
echo ""

#########################################
# 6. BUILD DE L'APPLICATION
#########################################

info "🔨 Étape 6/9 - Construction de l'application..."

# Supprimer l'ancien build
if [ -d "dist" ]; then
    rm -rf dist
    info "Ancien build supprimé"
fi

# Build
npm run build || error "Échec du build!"

# Vérifier que le build existe
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    error "Le build a échoué - le dossier dist est vide ou inexistant!"
fi

success "✅ Build terminé avec succès"
echo ""

#########################################
# 7. REDÉMARRAGE DE L'APPLICATION
#########################################

info "🚀 Étape 7/9 - Redémarrage de l'application..."

if [ "$PM2_INSTALLED" = true ]; then
    # Vérifier si l'app existe dans PM2
    if pm2 list | grep -q "$PM2_APP_NAME"; then
        info "Redémarrage de l'app PM2 existante..."
        pm2 restart "$PM2_APP_NAME"
    else
        info "Démarrage d'une nouvelle app PM2..."
        
        # Vérifier si ecosystem.config.js existe
        if [ -f "ecosystem.config.js" ]; then
            pm2 start ecosystem.config.js
        else
            # Démarrage simple
            pm2 start npm --name "$PM2_APP_NAME" -- run preview
        fi
    fi
    
    pm2 save
    success "✅ Application redémarrée via PM2"
else
    warn "PM2 non installé - veuillez redémarrer l'application manuellement:"
    echo "  cd $APP_DIR && npm run preview &"
fi

# Attendre que l'app démarre
info "Attente du démarrage (5 secondes)..."
sleep 5

echo ""

#########################################
# 8. TESTS DE SANTÉ
#########################################

if [ "$SKIP_TESTS" = false ]; then
    info "🏥 Étape 8/9 - Tests de santé..."
    
    # Test 1: Port en écoute
    info "Test 1: Vérification du port $APP_PORT..."
    if netstat -tlnp 2>/dev/null | grep -q ":$APP_PORT" || ss -tlnp 2>/dev/null | grep -q ":$APP_PORT"; then
        success "✅ Port $APP_PORT en écoute"
    else
        warn "⚠️  Port $APP_PORT ne semble pas en écoute"
    fi
    
    # Test 2: HTTP Response
    info "Test 2: Vérification de la réponse HTTP..."
    sleep 2
    if curl -f -s -m 5 "http://localhost:$APP_PORT" > /dev/null 2>&1; then
        success "✅ Application répond correctement"
    else
        warn "⚠️  Application ne répond pas sur http://localhost:$APP_PORT"
        warn "    Vérifiez les logs: pm2 logs $PM2_APP_NAME"
    fi
    
    # Test 3: PM2 Status
    if [ "$PM2_INSTALLED" = true ]; then
        info "Test 3: Statut PM2..."
        pm2 status "$PM2_APP_NAME" | grep -q "online" && success "✅ PM2 status: online" || warn "⚠️  PM2 status: pas online"
    fi
    
    echo ""
else
    warn "⚠️  Étape 8/9 - Tests de santé IGNORÉS (--skip-tests)"
    echo ""
fi

#########################################
# 9. RÉSUMÉ FINAL
#########################################

info "📋 Étape 9/9 - Résumé du déploiement"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${BLUE}📊 Informations:${NC}"
echo "  • Répertoire: $APP_DIR"
echo "  • Commit: $(cd "$APP_DIR" && git rev-parse --short HEAD)"
echo "  • Branch: $(cd "$APP_DIR" && git rev-parse --abbrev-ref HEAD)"
echo "  • Date: $(date '+%Y-%m-%d %H:%M:%S')"
if [ "$SKIP_BACKUP" = false ]; then
    echo "  • Backup: $BACKUP_DIR"
fi
echo ""

echo -e "${BLUE}🔍 Vérifications à faire:${NC}"
echo "  1. ✅ Ouvrir l'application dans le navigateur"
echo "  2. ✅ Tester la connexion (login)"
echo "  3. ✅ Vérifier le tableau de bord"
echo "  4. ✅ Tester la création de ticket"
echo "  5. ✅ Vérifier les pages admin"
echo "  6. ✅ Tester la protection XSS (essayer <script>)"
echo "  7. ✅ Vérifier le rate limiting (5 tentatives)"
echo ""

echo -e "${BLUE}📝 Commandes utiles:${NC}"
if [ "$PM2_INSTALLED" = true ]; then
    echo "  • Logs:     pm2 logs $PM2_APP_NAME"
    echo "  • Status:   pm2 status"
    echo "  • Restart:  pm2 restart $PM2_APP_NAME"
    echo "  • Stop:     pm2 stop $PM2_APP_NAME"
fi
echo "  • Build:    cd $APP_DIR && npm run build"
echo "  • Env vars: cat $APP_DIR/.env"
echo ""

if [ "$SKIP_BACKUP" = false ]; then
    echo -e "${YELLOW}🔙 En cas de problème (Rollback):${NC}"
    echo "  1. Arrêter l'app:  pm2 stop $PM2_APP_NAME"
    echo "  2. Restaurer:      cp -r $BACKUP_DIR/${APP_NAME}-src/* $APP_DIR/"
    echo "  3. Restaurer env:  cp $BACKUP_DIR/.env.backup $APP_DIR/.env"
    echo "  4. Rebuild:        cd $APP_DIR && npm install && npm run build"
    echo "  5. Redémarrer:     pm2 restart $PM2_APP_NAME"
    echo ""
fi

echo -e "${GREEN}========================================${NC}"
echo ""

# Afficher les derniers logs si PM2 est installé
if [ "$PM2_INSTALLED" = true ]; then
    info "📄 Derniers logs (10 lignes):"
    pm2 logs "$PM2_APP_NAME" --lines 10 --nostream 2>/dev/null || warn "Impossible de récupérer les logs"
fi

echo ""
success "🎉 Déploiement complet! L'application est prête à être testée."
echo ""

exit 0
