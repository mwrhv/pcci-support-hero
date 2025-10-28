# 📱 Guide Complet: Convertir PCCI Help Desk en APK Android

## 📋 Table des Matières
1. [Vue d'ensemble](#vue-densemble)
2. [Pré-requis](#pré-requis)
3. [Installation de Capacitor](#installation-de-capacitor)
4. [Configuration Android](#configuration-android)
5. [Build de l'APK](#build-de-lapk)
6. [Signature de l'APK](#signature-de-lapk)
7. [Publication sur Play Store](#publication-sur-play-store)
8. [Dépannage](#dépannage)

---

## 🎯 Vue d'ensemble

Nous allons utiliser **Capacitor** (par Ionic) pour convertir votre application React/Vite en application Android native.

### ✨ Avantages de Capacitor:
- ✅ Performance native
- ✅ Accès aux APIs natives (caméra, notifications, GPS, etc.)
- ✅ Maintenance facile
- ✅ Compatible avec React
- ✅ Prêt pour Play Store
- ✅ Support iOS aussi (bonus!)

### 📊 Taille APK estimée:
- **Debug APK**: ~50-80 MB
- **Release APK (optimisé)**: ~30-50 MB

---

## 🔧 Pré-requis

### Sur Votre Machine de Développement

#### 1. **Node.js et npm** (✅ Déjà installé)
```bash
node --version  # Devrait afficher v18+
npm --version   # Devrait afficher v9+
```

#### 2. **Java Development Kit (JDK)**

**Installation JDK 17 (Recommandé):**

**Sur Windows:**
```bash
# Téléchargez JDK 17 depuis:
https://www.oracle.com/java/technologies/downloads/#java17

# Ou utilisez chocolatey:
choco install openjdk17
```

**Sur macOS:**
```bash
brew install openjdk@17
```

**Sur Ubuntu/Linux:**
```bash
sudo apt update
sudo apt install openjdk-17-jdk
```

**Vérification:**
```bash
java -version
# Devrait afficher: openjdk version "17.0.x"
```

#### 3. **Android Studio**

**Téléchargement:**
- Allez sur: https://developer.android.com/studio
- Téléchargez la version pour votre OS
- Installez (cela prend ~10-15 minutes)

**Configuration Android Studio:**

1. **Ouvrez Android Studio**
2. **Allez dans**: File → Settings (Windows) ou Android Studio → Preferences (Mac)
3. **Appearance & Behavior → System Settings → Android SDK**
4. **Installez les SDK suivants:**
   ```
   ✅ Android 13.0 (Tiramisu) - API Level 33
   ✅ Android 12.0 (S) - API Level 31
   ✅ Android SDK Build-Tools
   ✅ Android SDK Command-line Tools
   ✅ Android Emulator (optionnel, pour tester)
   ```

5. **Notez le chemin du SDK**
   - Exemple Windows: `C:\Users\VotreNom\AppData\Local\Android\Sdk`
   - Exemple Mac: `/Users/VotreNom/Library/Android/sdk`
   - Exemple Linux: `/home/VotreNom/Android/Sdk`

#### 4. **Variables d'Environnement**

**Sur Windows:**
```bash
# Ouvrez PowerShell en tant qu'administrateur
setx ANDROID_HOME "C:\Users\VotreNom\AppData\Local\Android\Sdk"
setx PATH "%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools"
```

**Sur macOS/Linux:**
```bash
# Ajoutez à ~/.bashrc ou ~/.zshrc
export ANDROID_HOME=$HOME/Library/Android/sdk  # Mac
# export ANDROID_HOME=$HOME/Android/Sdk        # Linux
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Rechargez la configuration
source ~/.bashrc  # ou source ~/.zshrc
```

**Vérification:**
```bash
echo $ANDROID_HOME
# Devrait afficher le chemin du SDK

adb --version
# Devrait afficher: Android Debug Bridge version...
```

---

## 📦 Installation de Capacitor

### Étape 1: Installer Capacitor

```bash
# Allez dans le répertoire de votre projet
cd ~/pcci-helpdesk  # ou /home/user/webapp

# Installez Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# Vérifiez l'installation
npx cap --version
# Devrait afficher: @capacitor/cli 5.x.x
```

### Étape 2: Initialiser Capacitor (SI PAS DÉJÀ FAIT)

```bash
# Initialisez Capacitor
npx cap init "PCCI Help Desk" "com.pcci.helpdesk" --web-dir=dist

# Répondez aux questions:
# ✅ App name: PCCI Help Desk
# ✅ App ID: com.pcci.helpdesk
# ✅ Web asset directory: dist
```

### Étape 3: Ajouter la Plateforme Android

```bash
# Ajoutez Android
npx cap add android

# Cela va créer le dossier /android avec tout le projet Android
```

### Étape 4: Build Web

```bash
# Construisez votre application web
npm run build

# Copiez les fichiers dans Android
npx cap sync android
```

---

## ⚙️ Configuration Android

### 1. **Personnaliser l'Icône de l'Application**

**Créez votre icône:**
- Taille: 1024x1024 pixels
- Format: PNG avec transparence
- Nom: `icon.png`

**Générez les icônes pour Android:**

**Option A: Outil en ligne (Facile)**
1. Allez sur: https://icon.kitchen/
2. Uploadez votre icône 1024x1024
3. Sélectionnez "Android" et "Adaptive Icons"
4. Téléchargez le package
5. Extrayez dans `android/app/src/main/res/`

**Option B: Automatique avec Capacitor Assets**
```bash
# Installez l'outil
npm install -g @capacitor/assets

# Placez votre icon.png dans /android-resources/
mkdir -p android-resources
# Copiez votre icon.png dans ce dossier

# Générez les assets
npx capacitor-assets generate --android
```

### 2. **Configurer le Splash Screen**

**Créez votre splash screen:**
- Taille: 2732x2732 pixels (pour compatibilité)
- Format: PNG
- Contenu: Logo centré sur fond uni

**Placez dans:**
```bash
android-resources/splash.png
```

**Générez:**
```bash
npx capacitor-assets generate --android
```

### 3. **Modifier les Permissions (android/app/src/main/AndroidManifest.xml)**

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissions Internet (obligatoire) -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Permissions optionnelles (selon vos besoins) -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    
    <!-- Notifications -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>
    </application>
</manifest>
```

### 4. **Configurer le Nom de l'App**

**Éditez:** `android/app/src/main/res/values/strings.xml`

```xml
<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">PCCI Help Desk</string>
    <string name="title_activity_main">PCCI Help Desk</string>
    <string name="package_name">com.pcci.helpdesk</string>
    <string name="custom_url_scheme">com.pcci.helpdesk</string>
</resources>
```

### 5. **Configurer les Versions**

**Éditez:** `android/app/build.gradle`

```gradle
android {
    namespace "com.pcci.helpdesk"
    compileSdkVersion 33
    
    defaultConfig {
        applicationId "com.pcci.helpdesk"
        minSdkVersion 22
        targetSdkVersion 33
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
    
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Explications:**
- `versionCode`: Numéro de version incrémental (1, 2, 3, 4...)
- `versionName`: Nom lisible de la version ("1.0.0", "1.1.0", etc.)
- Incrémentez `versionCode` à chaque nouvelle version!

---

## 🔨 Build de l'APK

### Build Debug (Pour Tests)

**Méthode 1: Ligne de Commande (Rapide)**

```bash
# 1. Build web
npm run build

# 2. Sync avec Android
npx cap sync android

# 3. Build APK debug
cd android
./gradlew assembleDebug

# APK généré dans:
# android/app/build/outputs/apk/debug/app-debug.apk
```

**Méthode 2: Android Studio (Interface graphique)**

```bash
# 1. Ouvrez le projet Android
npx cap open android

# 2. Dans Android Studio:
# - Build → Build Bundle(s) / APK(s) → Build APK(s)
# - Attendez la compilation (~2-5 minutes la première fois)
# - Cliquez sur "locate" quand le build est terminé

# APK dans: android/app/build/outputs/apk/debug/
```

**Tester l'APK Debug:**

```bash
# Option 1: Installer sur un appareil connecté en USB
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Option 2: Copier l'APK sur votre téléphone
# Transférez app-debug.apk sur votre téléphone
# Ouvrez-le pour l'installer
# (Activez "Sources inconnues" dans les paramètres si nécessaire)
```

---

### Build Release (Pour Production / Play Store)

**Étape 1: Générer une Clé de Signature (Keystore)**

```bash
# Allez dans le dossier android/app
cd android/app

# Générez la clé (à faire UNE SEULE FOIS)
keytool -genkey -v -keystore pcci-helpdesk.keystore \
  -alias pcci-helpdesk-key \
  -keyalg RSA -keysize 2048 -validity 10000

# Répondez aux questions:
# - Mot de passe du keystore: [choisissez un mot de passe FORT]
# - Confirmation: [même mot de passe]
# - Prénom et nom: [Votre nom ou nom de l'entreprise]
# - Unité organisationnelle: IT
# - Organisation: PCCI
# - Ville: [Votre ville]
# - État: [Votre région]
# - Code pays: CI (ou votre pays)
# - Correct? oui
# - Mot de passe de l'alias: [même mot de passe ou différent]
```

**⚠️ IMPORTANT: Sauvegardez votre Keystore!**
```
Le fichier pcci-helpdesk.keystore est CRUCIAL!
- Sauvegardez-le dans un endroit sûr (cloud, clé USB)
- Notez le mot de passe dans un gestionnaire de mots de passe
- SANS CE FICHIER, vous ne pourrez JAMAIS mettre à jour votre app!
```

**Étape 2: Configurer la Signature**

**Créez:** `android/key.properties`

```properties
storeFile=app/pcci-helpdesk.keystore
storePassword=VOTRE_MOT_DE_PASSE_KEYSTORE
keyAlias=pcci-helpdesk-key
keyPassword=VOTRE_MOT_DE_PASSE_ALIAS
```

**⚠️ Ajoutez au .gitignore:**
```bash
echo "android/key.properties" >> .gitignore
echo "android/app/*.keystore" >> .gitignore
```

**Éditez:** `android/app/build.gradle`

Ajoutez AVANT `android {`:
```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config ...
    
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Étape 3: Build Release APK**

```bash
# Retournez à la racine
cd ../..

# Build web en mode production
npm run build

# Sync
npx cap sync android

# Build APK release
cd android
./gradlew assembleRelease

# APK signé généré dans:
# android/app/build/outputs/apk/release/app-release.apk
```

**Étape 4: Vérifier la Signature**

```bash
# Vérifiez que l'APK est bien signé
keytool -printcert -jarfile app/build/outputs/apk/release/app-release.apk

# Devrait afficher les infos de votre certificat
```

---

## 📤 Publication sur Play Store

### Préparer l'App pour Play Store

**1. Build App Bundle (Recommandé pour Play Store)**

```bash
cd android
./gradlew bundleRelease

# Fichier généré:
# android/app/build/outputs/bundle/release/app-release.aab
```

**2. Créer un Compte Développeur Google Play**

- Allez sur: https://play.google.com/console
- Coût: 25 USD (paiement unique, à vie)
- Remplissez les informations de votre entreprise

**3. Créer une Nouvelle Application**

1. **Tableau de bord** → **Créer une application**
2. **Langue par défaut**: Français
3. **Nom**: PCCI Help Desk
4. **Type**: Application
5. **Gratuite/Payante**: Gratuite (probablement)

**4. Remplir la Fiche du Store**

**Description courte (80 caractères max):**
```
Système de gestion des incidents IT pour PCCI
```

**Description complète (4000 caractères max):**
```
PCCI Help Desk est une application de gestion des incidents IT pour tous les départements de l'entreprise.

Fonctionnalités principales:
✅ Création et suivi de tickets
✅ Analyse IA des incidents avec Genspark
✅ Notifications en temps réel
✅ Gestion des fiches administratives
✅ Statistiques et rapports détaillés

Pour les techniciens:
- Gestion complète des tickets
- Priorisation automatique
- Solutions proposées par IA

Pour les superviseurs:
- Tableaux de bord analytiques
- Rapports par département
- Suivi des performances

Pour les administrateurs:
- Gestion des utilisateurs
- Logs d'audit
- Configuration système

Application sécurisée avec authentification, protection XSS, et gestion complète des droits d'accès.
```

**5. Assets Graphiques**

Préparez:
- **Icône**: 512x512px PNG (obligatoire)
- **Feature Graphic**: 1024x500px PNG (obligatoire)
- **Screenshots**: 
  - Téléphone: 2-8 images, 16:9 ou 9:16
  - Tablette 7": 1-8 images (optionnel)
  - Tablette 10": 1-8 images (optionnel)

**6. Télécharger l'App Bundle**

1. **Production** → **Versions** → **Créer une version**
2. **Téléchargez** `app-release.aab`
3. **Notes de version**: Décrivez les fonctionnalités
4. **Enregistrez** et **Vérifiez**

**7. Classification du Contenu**

- Répondez au questionnaire Google
- Catégorie: Productivité / Entreprise
- Public cible: 18+

**8. Soumission**

- **Vérifiez** tous les points
- **Soumettez pour examen**
- Délai d'examen: 1-7 jours

---

## 🔄 Mises à Jour Futures

### Workflow de Mise à Jour

```bash
# 1. Modifiez votre code React
# ... vos modifications ...

# 2. Incrémentez les versions dans android/app/build.gradle
# versionCode: 2 (était 1)
# versionName: "1.1.0" (était "1.0.0")

# 3. Build web
npm run build

# 4. Sync
npx cap sync android

# 5. Build release
cd android
./gradlew bundleRelease

# 6. Uploadez sur Play Store
# Le nouveau .aab remplacera l'ancien
```

---

## 🆘 Dépannage

### Problème 1: "SDK not found"

**Erreur:**
```
SDK location not found. Define a valid SDK location with an
ANDROID_HOME environment variable or by setting the sdk.dir path
```

**Solution:**
```bash
# Créez android/local.properties
echo "sdk.dir=/chemin/vers/votre/sdk" > android/local.properties

# Exemple Windows:
# sdk.dir=C:\\Users\\VotreNom\\AppData\\Local\\Android\\Sdk

# Exemple Mac:
# sdk.dir=/Users/VotreNom/Library/Android/sdk

# Exemple Linux:
# sdk.dir=/home/VotreNom/Android/Sdk
```

### Problème 2: Build échoue avec "Gradle error"

**Solution:**
```bash
# Nettoyez le build
cd android
./gradlew clean

# Retry
./gradlew assembleDebug
```

### Problème 3: APK trop gros

**Solution: Activer ProGuard et optimiser**

Dans `android/app/build.gradle`:
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### Problème 4: "Application not installed"

**Solutions:**
```bash
# 1. Désinstallez l'ancienne version
adb uninstall com.pcci.helpdesk

# 2. Réinstallez
adb install app-debug.apk

# 3. Si problème de signature, supprimez l'ancienne app manuellement
# depuis le téléphone
```

### Problème 5: App plante au démarrage

**Solution: Vérifiez les logs**
```bash
# Connectez votre appareil et lancez:
adb logcat | grep -i "pcci"

# Ou dans Android Studio:
# View → Tool Windows → Logcat
```

---

## 📊 Checklist Complète

### Avant de Commencer
- [ ] Node.js installé (v18+)
- [ ] JDK 17 installé
- [ ] Android Studio installé
- [ ] Android SDK configuré
- [ ] Variables d'environnement configurées

### Configuration
- [ ] Capacitor installé
- [ ] Plateforme Android ajoutée
- [ ] capacitor.config.ts configuré
- [ ] Icône 1024x1024 créée
- [ ] Splash screen créé

### Build Debug
- [ ] `npm run build` réussi
- [ ] `npx cap sync android` réussi
- [ ] APK debug généré
- [ ] APK testé sur appareil

### Build Release
- [ ] Keystore généré et sauvegardé
- [ ] key.properties créé
- [ ] build.gradle configuré
- [ ] Versions incrémentées
- [ ] APK release généré et testé

### Play Store
- [ ] Compte développeur créé
- [ ] Fiche store complétée
- [ ] Assets graphiques préparés
- [ ] App Bundle généré
- [ ] App soumise pour examen

---

## 📚 Ressources

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Android Developer**: https://developer.android.com
- **Play Console**: https://play.google.com/console
- **Icon Generator**: https://icon.kitchen/

---

## 🎉 Résumé Rapide

### Build Debug (Test):
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

### Build Release (Production):
```bash
# 1. Générez keystore (une fois)
keytool -genkey -v -keystore pcci-helpdesk.keystore ...

# 2. Configurez key.properties

# 3. Build
npm run build
npx cap sync android
cd android && ./gradlew bundleRelease
```

**Voilà! Vous avez maintenant un APK Android de votre application PCCI Help Desk!** 🚀

---

**Besoin d'aide?** Consultez la section Dépannage ou contactez le support!
