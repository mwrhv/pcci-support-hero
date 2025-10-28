# 🚀 Guide Rapide: Créer votre APK en 30 Minutes

## 🎯 Objectif

Générer rapidement un APK de test de votre application PCCI Help Desk.

---

## ⚡ Installation Express (15 minutes)

### 1. **Installer Java JDK 17** (5 min)

**Windows:**
```bash
# Téléchargez depuis:
https://www.oracle.com/java/technologies/downloads/#java17

# Ou avec Chocolatey:
choco install openjdk17
```

**Mac:**
```bash
brew install openjdk@17
```

**Linux:**
```bash
sudo apt update
sudo apt install openjdk-17-jdk
```

**Vérifiez:**
```bash
java -version
# Doit afficher: openjdk version "17.0.x"
```

---

### 2. **Installer Android Studio** (10 min)

1. **Téléchargez**: https://developer.android.com/studio
2. **Installez** (suivez l'assistant)
3. **Lancez Android Studio**
4. **Suivez le setup wizard**:
   - Installez Android SDK
   - Installez Android SDK Build-Tools
   - Notez le chemin du SDK

5. **Configurez les variables d'environnement**:

**Windows (PowerShell admin):**
```powershell
setx ANDROID_HOME "C:\Users\VotreNom\AppData\Local\Android\Sdk"
```

**Mac/Linux (ajoutez à ~/.bashrc ou ~/.zshrc):**
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk  # Mac
# ou
export ANDROID_HOME=$HOME/Android/Sdk  # Linux

export PATH=$PATH:$ANDROID_HOME/platform-tools
```

**Rechargez:**
```bash
# Mac/Linux
source ~/.bashrc

# Windows: Fermez et rouvrez PowerShell
```

**Vérifiez:**
```bash
echo $ANDROID_HOME
adb --version
```

---

## 🔨 Build Rapide (5 minutes)

### Méthode Automatique (RECOMMANDÉE)

```bash
# 1. Allez dans votre projet
cd ~/pcci-helpdesk  # ou votre chemin

# 2. Installez Capacitor (si pas déjà fait)
npm install @capacitor/core @capacitor/cli @capacitor/android

# 3. Ajoutez Android (si pas déjà fait)
npx cap add android

# 4. Utilisez le script automatique
./build-android.sh debug
```

**C'EST TOUT!** ✅

Votre APK sera dans:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

### Méthode Manuelle

Si le script ne fonctionne pas:

```bash
# 1. Build web
npm run build

# 2. Sync Capacitor
npx cap sync android

# 3. Build APK
cd android
./gradlew assembleDebug

# Windows: utilisez gradlew.bat au lieu de ./gradlew
```

APK dans: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📱 Installer sur Votre Téléphone (2 minutes)

### Méthode 1: Via USB (Recommandée)

1. **Activez le mode développeur sur votre téléphone:**
   - Allez dans: Paramètres → À propos du téléphone
   - Tapez 7 fois sur "Numéro de build"
   - Message: "Vous êtes maintenant développeur"

2. **Activez le débogage USB:**
   - Paramètres → Options développeur
   - Activez "Débogage USB"

3. **Connectez votre téléphone en USB**

4. **Installez l'APK:**
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Méthode 2: Transfert Direct

1. **Copiez l'APK** sur votre téléphone (USB, email, cloud)
2. **Sur le téléphone**: Ouvrez le fichier APK
3. **Autorisez** l'installation depuis sources inconnues
4. **Installez**

---

## 🎨 Personnalisation (Optionnel)

### Changer l'Icône de l'App

1. **Créez une icône 1024x1024 PNG**
2. **Utilisez un générateur en ligne:**
   - Allez sur: https://icon.kitchen/
   - Uploadez votre icône
   - Sélectionnez "Android"
   - Téléchargez le package
   - Extrayez dans: `android/app/src/main/res/`

3. **Rebuild:**
```bash
./build-android.sh debug
```

### Changer le Nom de l'App

**Éditez:** `android/app/src/main/res/values/strings.xml`

```xml
<string name="app_name">Mon Nom d'App</string>
```

---

## 🆘 Problèmes Courants

### "SDK not found"

**Solution:**
```bash
# Créez android/local.properties
cd android
echo "sdk.dir=/chemin/vers/votre/sdk" > local.properties

# Exemple:
# Windows: sdk.dir=C:\\Users\\VotreNom\\AppData\\Local\\Android\\Sdk
# Mac: sdk.dir=/Users/VotreNom/Library/Android/sdk
# Linux: sdk.dir=/home/VotreNom/Android/Sdk
```

### "Gradle build failed"

**Solution:**
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

### "Application not installed" sur téléphone

**Solution:**
```bash
# Désinstallez l'ancienne version
adb uninstall com.pcci.helpdesk

# Réinstallez
adb install app-debug.apk
```

---

## 📊 Checklist Rapide

Cochez au fur et à mesure:

### Installation
- [ ] Java JDK 17 installé
- [ ] Android Studio installé
- [ ] Android SDK configuré
- [ ] ANDROID_HOME configuré
- [ ] adb fonctionne

### Build
- [ ] Capacitor installé
- [ ] Plateforme Android ajoutée
- [ ] `npm run build` réussi
- [ ] APK debug généré

### Test
- [ ] APK installé sur téléphone
- [ ] App se lance
- [ ] App fonctionne correctement

---

## 🎉 Prochaines Étapes

Maintenant que vous avez un APK de test:

1. **Testez toutes les fonctionnalités** sur votre téléphone
2. **Notez les bugs** ou problèmes
3. **Corrigez et rebuild**

Quand tout fonctionne:

4. **Lisez BUILD_APK_GUIDE.md** pour créer un APK release signé
5. **Préparez pour Play Store** si vous voulez publier

---

## 📚 Documentation Complète

- **Guide Complet**: BUILD_APK_GUIDE.md
- **Documentation Capacitor**: https://capacitorjs.com/docs
- **Android Developer**: https://developer.android.com

---

## ⏱️ Temps Total Estimé

- ✅ Installation: 15 minutes
- ✅ Premier build: 5 minutes
- ✅ Installation sur téléphone: 2 minutes
- **TOTAL: ~22 minutes** (30 minutes avec marge)

---

## 🚀 Commandes Rapides

```bash
# Build debug
./build-android.sh debug

# Build release (nécessite keystore)
./build-android.sh release

# Build pour Play Store
./build-android.sh bundle

# Nettoyer
./build-android.sh clean

# Installer sur appareil
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

**Bonne création d'APK! 📱**

Si vous rencontrez des problèmes, consultez BUILD_APK_GUIDE.md pour une aide détaillée!
