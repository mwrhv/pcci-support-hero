# 📱 Guide de Déploiement Mobile Native - PCCI Help Desk

Ce guide explique comment transformer votre application web en application mobile native pour iOS et Android.

## 🚀 Fonctionnalités Natives Implémentées

### ✅ Déjà Configuré
- ✅ **Caméra Native** - Prendre des photos et joindre aux tickets
- ✅ **Galerie Photos** - Sélectionner des images existantes
- ✅ **Push Notifications** - Recevoir des notifications sur mobile
- ✅ **Haptic Feedback** - Retours tactiles pour les interactions
- ✅ **Status Bar** - Contrôle de l'apparence de la barre de statut
- ✅ **Splash Screen** - Écran de chargement professionnel
- ✅ **App State Management** - Gestion de l'état de l'application

## 📋 Prérequis

### Pour iOS
- Mac avec macOS 10.15+ (Catalina ou supérieur)
- Xcode 14+ installé depuis l'App Store
- Un compte Apple Developer (gratuit pour développement, $99/an pour production)
- CocoaPods installé : `sudo gem install cocoapods`

### Pour Android
- Android Studio Arctic Fox (2020.3.1) ou supérieur
- Java Development Kit (JDK) 11+
- Android SDK installé via Android Studio
- Un appareil Android ou un émulateur configuré

## 🛠️ Installation et Configuration

### 1️⃣ Exportez le Projet vers GitHub

1. Cliquez sur le bouton **GitHub** en haut à droite
2. Connectez votre compte GitHub si ce n'est pas déjà fait
3. Créez un nouveau repository
4. Le code sera automatiquement synchronisé

### 2️⃣ Clonez le Projet Localement

```bash
# Clonez votre repository
git clone https://github.com/votre-username/pcci-support-hero.git
cd pcci-support-hero

# Installez les dépendances
npm install
```

### 3️⃣ Ajoutez les Plateformes Natives

```bash
# Pour iOS (seulement sur Mac)
npx cap add ios

# Pour Android
npx cap add android

# Mettez à jour les dépendances natives
npx cap update ios
npx cap update android
```

### 4️⃣ Construisez le Projet Web

```bash
# Construisez le projet
npm run build

# Synchronisez avec les plateformes natives
npx cap sync
```

## 🏃 Lancer l'Application

### Sur iOS (Mac uniquement)

```bash
# Ouvrez le projet dans Xcode
npx cap open ios
```

Dans Xcode :
1. Sélectionnez votre appareil/simulateur cible
2. Cliquez sur le bouton Play (▶️) pour lancer

Ou directement en ligne de commande :
```bash
npx cap run ios
```

### Sur Android

```bash
# Ouvrez le projet dans Android Studio
npx cap open android
```

Dans Android Studio :
1. Attendez que Gradle termine la synchronisation
2. Sélectionnez votre appareil/émulateur
3. Cliquez sur Run (▶️)

Ou directement en ligne de commande :
```bash
npx cap run android
```

## 🔄 Flux de Développement

### Développement Continu

1. **Modifiez le code dans Lovable** - Les changements sont automatiquement poussés vers GitHub
2. **Sur votre machine locale :**
   ```bash
   git pull
   npm run build
   npx cap sync
   ```
3. **Relancez l'app** dans Xcode/Android Studio

### Hot Reload (Développement Rapide)

L'application est configurée pour charger depuis l'URL de développement :
```
https://089331a4-8d89-4957-903a-0273f3dabe4d.lovableproject.com
```

Cela signifie que :
- ✅ Les changements dans Lovable apparaissent instantanément dans l'app mobile
- ✅ Pas besoin de rebuild à chaque modification
- ⚠️ Nécessite une connexion internet

### Mode Production

Pour désactiver le hot reload et utiliser les fichiers locaux :

1. Ouvrez `capacitor.config.ts`
2. Commentez ou supprimez la section `server` :
```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.089331a48d894957903a0273f3dabe4d',
  appName: 'pcci-support-hero',
  webDir: 'dist',
  // Retirez cette section pour la production
  // server: {
  //   url: 'https://089331a4-8d89-4957-903a-0273f3dabe4d.lovableproject.com',
  //   cleartext: true
  // }
};
```
3. Rebuild et resync :
```bash
npm run build
npx cap sync
```

## 📦 Publication dans les Stores

### iOS App Store

1. **Préparez votre app :**
   - Créez un App ID dans Apple Developer Portal
   - Configurez les certificates et provisioning profiles
   - Ajoutez les icônes et splash screens

2. **Dans Xcode :**
   - Product → Archive
   - Distribuez vers App Store Connect
   - Soumettez pour review

3. **Documentation :** [Apple Developer Guide](https://developer.apple.com/app-store/submissions/)

### Google Play Store

1. **Préparez votre app :**
   - Créez un compte Google Play Developer ($25 unique)
   - Générez une signing key
   - Préparez les assets (icônes, screenshots, description)

2. **Dans Android Studio :**
   - Build → Generate Signed Bundle/APK
   - Uploadez sur Google Play Console
   - Configurez la fiche du store
   - Soumettez pour review

3. **Documentation :** [Google Play Console Help](https://support.google.com/googleplay/android-developer)

## 🔧 Utilisation des Fonctionnalités Natives

### Caméra et Photos

Dans votre code React :
```typescript
import { useNativeCamera } from '@/hooks/useNativeCamera';

function MyComponent() {
  const { capturePhoto, selectPhoto, photoUri } = useNativeCamera();
  
  return (
    <div>
      <button onClick={capturePhoto}>Prendre une Photo</button>
      <button onClick={selectPhoto}>Choisir de la Galerie</button>
      {photoUri && <img src={photoUri} alt="Photo" />}
    </div>
  );
}
```

### Haptic Feedback

```typescript
import { hapticImpact, hapticNotification } from '@/lib/capacitor-native';

// Vibration légère
await hapticImpact('Light');

// Notification de succès
await hapticNotification('success');
```

### Push Notifications

Les notifications push sont automatiquement initialisées. Voir `src/lib/capacitor-native.ts` pour les listeners.

## 🐛 Résolution des Problèmes

### L'app ne se lance pas sur iOS
- Vérifiez que Xcode est à jour
- Nettoyez le build : Product → Clean Build Folder
- Vérifiez les permissions dans Info.plist

### L'app ne se lance pas sur Android
- Vérifiez que JAVA_HOME est configuré
- Nettoyez le projet : Build → Clean Project
- Invalidez le cache : File → Invalidate Caches / Restart

### Les changements ne s'affichent pas
```bash
# Forcez une resynchronisation
npm run build
npx cap sync
```

### Problèmes de caméra
Assurez-vous d'avoir ajouté les permissions dans :
- **iOS** : `ios/App/App/Info.plist`
- **Android** : `android/app/src/main/AndroidManifest.xml`

## 📚 Ressources

- [Documentation Capacitor](https://capacitorjs.com/docs)
- [Forum Communauté Capacitor](https://forum.ionicframework.com/c/capacitor)
- [Plugins Capacitor](https://capacitorjs.com/docs/plugins)
- [Guide de Déploiement iOS](https://capacitorjs.com/docs/ios/deploying-to-app-store)
- [Guide de Déploiement Android](https://capacitorjs.com/docs/android/deploying-to-google-play)

## 💡 Conseils

- **Testez d'abord sur émulateur** avant d'utiliser un appareil physique
- **Utilisez le mode hot reload** pendant le développement pour gagner du temps
- **Configurez le mode production** avant de publier dans les stores
- **Testez les permissions** (caméra, notifications) sur appareil réel
- **Optimisez les images** et assets pour réduire la taille de l'app

## 🆘 Support

Pour toute question ou problème :
1. Consultez la [documentation Capacitor](https://capacitorjs.com/docs)
2. Recherchez dans les [issues GitHub de Capacitor](https://github.com/ionic-team/capacitor/issues)
3. Demandez de l'aide dans le [forum Ionic](https://forum.ionicframework.com/)

---

✨ **Bonne chance avec votre application mobile native !** 📱