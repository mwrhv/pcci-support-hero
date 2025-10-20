import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPushNotifications, hideSplashScreen, setStatusBarDark, isNative } from "./lib/capacitor-native";

// Initialize native features
const initNativeFeatures = async () => {
  if (isNative()) {
    console.log('Running on native platform, initializing features...');
    
    // Initialize push notifications
    await initPushNotifications();
    
    // Set status bar style
    await setStatusBarDark();
    
    // Hide splash screen after app is ready
    setTimeout(async () => {
      await hideSplashScreen();
    }, 500);
  }
};

// Initialize and render app
initNativeFeatures();

createRoot(document.getElementById("root")!).render(<App />);
