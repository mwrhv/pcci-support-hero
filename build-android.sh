#!/bin/bash

#########################################
# Script de Build Android APK/AAB
# Usage: ./build-android.sh [debug|release|bundle]
# Version: 1.0
#########################################

set -e  # Arrêter en cas d'erreur

# Configuration
APP_NAME="PCCI Help Desk"
APP_ID="com.pcci.helpdesk"
BUILD_TYPE="${1:-debug}"  # Par défaut: debug

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Bannière
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   $APP_NAME - Build Android${NC}"
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

# Vérifier les pré-requis
check_requirements() {
    info "🔍 Vérification des pré-requis..."
    
    # Node.js
    if ! command -v node >/dev/null 2>&1; then
        error "Node.js n'est pas installé!"
    fi
    NODE_VERSION=$(node -v)
    info "Node.js: $NODE_VERSION"
    
    # npm
    if ! command -v npm >/dev/null 2>&1; then
        error "npm n'est pas installé!"
    fi
    NPM_VERSION=$(npm -v)
    info "npm: $NPM_VERSION"
    
    # Java
    if ! command -v java >/dev/null 2>&1; then
        error "Java n'est pas installé! Installez JDK 17."
    fi
    JAVA_VERSION=$(java -version 2>&1 | head -n 1)
    info "Java: $JAVA_VERSION"
    
    # ANDROID_HOME
    if [ -z "$ANDROID_HOME" ]; then
        warn "ANDROID_HOME n'est pas défini!"
        warn "Vérifiez que Android SDK est installé et configuré."
    else
        info "Android SDK: $ANDROID_HOME"
    fi
    
    # Capacitor
    if ! command -v npx >/dev/null 2>&1; then
        error "npx n'est pas disponible!"
    fi
    
    success "✅ Tous les pré-requis sont satisfaits"
    echo ""
}

# Installer les dépendances
install_dependencies() {
    info "📦 Installation des dépendances..."
    
    if [ ! -d "node_modules" ]; then
        npm install || error "Échec de npm install"
    else
        info "node_modules existe déjà, ignoré"
    fi
    
    # Vérifier si Capacitor est installé
    if ! npm list @capacitor/core >/dev/null 2>&1; then
        info "Installation de Capacitor..."
        npm install @capacitor/core @capacitor/cli @capacitor/android || error "Échec d'installation de Capacitor"
    fi
    
    success "✅ Dépendances installées"
    echo ""
}

# Vérifier si Android est configuré
check_android_setup() {
    info "🔍 Vérification de la configuration Android..."
    
    if [ ! -d "android" ]; then
        warn "Le dossier android/ n'existe pas!"
        info "Initialisation de la plateforme Android..."
        npx cap add android || error "Échec de l'ajout d'Android"
    fi
    
    success "✅ Configuration Android OK"
    echo ""
}

# Build web
build_web() {
    info "🔨 Build de l'application web..."
    
    npm run build || error "Échec du build web"
    
    if [ ! -d "dist" ]; then
        error "Le dossier dist/ n'a pas été créé!"
    fi
    
    success "✅ Build web terminé"
    echo ""
}

# Sync avec Capacitor
sync_capacitor() {
    info "🔄 Synchronisation avec Capacitor..."
    
    npx cap sync android || error "Échec de la synchronisation Capacitor"
    
    success "✅ Synchronisation terminée"
    echo ""
}

# Build Android Debug
build_debug() {
    info "🔨 Build APK Debug..."
    
    cd android
    ./gradlew assembleDebug || error "Échec du build debug"
    cd ..
    
    APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
    
    if [ -f "$APK_PATH" ]; then
        APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
        success "✅ APK Debug généré: $APK_PATH ($APK_SIZE)"
        info "📱 Pour installer: adb install $APK_PATH"
    else
        error "APK non trouvé!"
    fi
    
    echo ""
}

# Build Android Release
build_release() {
    info "🔨 Build APK Release..."
    
    # Vérifier que la clé existe
    if [ ! -f "android/key.properties" ]; then
        error "Fichier android/key.properties introuvable! Créez-le d'abord."
    fi
    
    cd android
    ./gradlew assembleRelease || error "Échec du build release"
    cd ..
    
    APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
    
    if [ -f "$APK_PATH" ]; then
        APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
        success "✅ APK Release généré: $APK_PATH ($APK_SIZE)"
        
        # Vérifier la signature
        info "🔐 Vérification de la signature..."
        keytool -printcert -jarfile "$APK_PATH" | head -n 5
    else
        error "APK non trouvé!"
    fi
    
    echo ""
}

# Build Android Bundle (AAB)
build_bundle() {
    info "🔨 Build App Bundle (AAB) pour Play Store..."
    
    # Vérifier que la clé existe
    if [ ! -f "android/key.properties" ]; then
        error "Fichier android/key.properties introuvable! Créez-le d'abord."
    fi
    
    cd android
    ./gradlew bundleRelease || error "Échec du build bundle"
    cd ..
    
    AAB_PATH="android/app/build/outputs/bundle/release/app-release.aab"
    
    if [ -f "$AAB_PATH" ]; then
        AAB_SIZE=$(du -h "$AAB_PATH" | cut -f1)
        success "✅ App Bundle généré: $AAB_PATH ($AAB_SIZE)"
        info "📤 Prêt pour upload sur Play Store Console"
    else
        error "App Bundle non trouvé!"
    fi
    
    echo ""
}

# Nettoyer les builds précédents
clean_builds() {
    info "🧹 Nettoyage des builds précédents..."
    
    if [ -d "android/app/build" ]; then
        cd android
        ./gradlew clean || warn "Échec du clean"
        cd ..
    fi
    
    if [ -d "dist" ]; then
        rm -rf dist
        info "Dossier dist/ supprimé"
    fi
    
    success "✅ Nettoyage terminé"
    echo ""
}

# Afficher l'aide
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  debug       Build APK debug (par défaut)"
    echo "  release     Build APK release signé"
    echo "  bundle      Build App Bundle (AAB) pour Play Store"
    echo "  clean       Nettoyer les builds"
    echo "  -h, --help  Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0              # Build debug"
    echo "  $0 debug        # Build debug"
    echo "  $0 release      # Build release"
    echo "  $0 bundle       # Build AAB pour Play Store"
    echo "  $0 clean        # Nettoyer"
    echo ""
    exit 0
}

# Main
main() {
    # Vérifier les arguments
    case "$BUILD_TYPE" in
        -h|--help)
            show_help
            ;;
        clean)
            clean_builds
            exit 0
            ;;
        debug|release|bundle)
            # Continue
            ;;
        *)
            error "Type de build invalide: $BUILD_TYPE. Utilisez: debug, release, ou bundle"
            ;;
    esac
    
    # Afficher la configuration
    info "Configuration du build:"
    echo "  - App: $APP_NAME"
    echo "  - ID: $APP_ID"
    echo "  - Type: $BUILD_TYPE"
    echo ""
    
    # Exécuter les étapes
    check_requirements
    install_dependencies
    check_android_setup
    build_web
    sync_capacitor
    
    # Build selon le type
    case "$BUILD_TYPE" in
        debug)
            build_debug
            ;;
        release)
            build_release
            ;;
        bundle)
            build_bundle
            ;;
    esac
    
    # Résumé final
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ✅ BUILD TERMINÉ AVEC SUCCÈS!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    case "$BUILD_TYPE" in
        debug)
            echo "📱 APK Debug généré:"
            echo "   android/app/build/outputs/apk/debug/app-debug.apk"
            echo ""
            echo "Pour installer sur votre appareil:"
            echo "   adb install android/app/build/outputs/apk/debug/app-debug.apk"
            ;;
        release)
            echo "📱 APK Release généré:"
            echo "   android/app/build/outputs/apk/release/app-release.apk"
            echo ""
            echo "Cet APK est signé et prêt pour distribution!"
            ;;
        bundle)
            echo "📦 App Bundle généré:"
            echo "   android/app/build/outputs/bundle/release/app-release.aab"
            echo ""
            echo "Uploadez ce fichier sur Google Play Console:"
            echo "   https://play.google.com/console"
            ;;
    esac
    
    echo ""
}

# Exécuter
main

exit 0
