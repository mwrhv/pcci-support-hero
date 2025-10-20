import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Check if running on native platform
export const isNative = () => Capacitor.isNativePlatform();

// Camera utilities
export const takePhoto = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera
    });
    return image.webPath;
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
};

export const pickFromGallery = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos
    });
    return image.webPath;
  } catch (error) {
    console.error('Error picking photo:', error);
    return null;
  }
};

// Push Notifications utilities
export const initPushNotifications = async () => {
  if (!isNative()) return;

  try {
    // Request permission
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('Push notification permission denied');
      return;
    }

    // Register with Apple / Google
    await PushNotifications.register();

    // Listen for registration
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
    });

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });

    // Listen for push notifications received
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received:', notification);
    });

    // Listen for push notification actions
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed:', notification);
    });

  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
};

// Haptics utilities
export const hapticImpact = async (style: ImpactStyle = ImpactStyle.Medium) => {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style });
  } catch (error) {
    console.error('Error triggering haptic:', error);
  }
};

export const hapticNotification = async (type: 'success' | 'warning' | 'error' = 'success') => {
  if (!isNative()) return;
  try {
    await Haptics.notification({ type: type.toUpperCase() as any });
  } catch (error) {
    console.error('Error triggering haptic notification:', error);
  }
};

// Status Bar utilities
export const setStatusBarLight = async () => {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: Style.Light });
  } catch (error) {
    console.error('Error setting status bar:', error);
  }
};

export const setStatusBarDark = async () => {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
  } catch (error) {
    console.error('Error setting status bar:', error);
  }
};

export const hideStatusBar = async () => {
  if (!isNative()) return;
  try {
    await StatusBar.hide();
  } catch (error) {
    console.error('Error hiding status bar:', error);
  }
};

export const showStatusBar = async () => {
  if (!isNative()) return;
  try {
    await StatusBar.show();
  } catch (error) {
    console.error('Error showing status bar:', error);
  }
};

// Splash Screen utilities
export const hideSplashScreen = async () => {
  if (!isNative()) return;
  try {
    await SplashScreen.hide();
  } catch (error) {
    console.error('Error hiding splash screen:', error);
  }
};

// App utilities
export const addAppStateListener = (callback: (isActive: boolean) => void) => {
  if (!isNative()) return;
  
  App.addListener('appStateChange', ({ isActive }) => {
    callback(isActive);
  });
};

export const getAppInfo = async () => {
  if (!isNative()) return null;
  
  try {
    const info = await App.getInfo();
    return info;
  } catch (error) {
    console.error('Error getting app info:', error);
    return null;
  }
};

// Back button handler for Android
export const addBackButtonListener = (callback: () => void) => {
  if (!isNative()) return;
  
  App.addListener('backButton', () => {
    callback();
  });
};