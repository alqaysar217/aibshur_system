import { FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';

// Hardcoded Firebase config as requested to bypass .env issues in development.
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBGsKSyhMg7j9gdp1nleEkADhkuQPvqutM",
  authDomain: "studio-493831327-52b75.firebaseapp.com",
  projectId: "studio-493831327-52b75",
  storageBucket: "studio-493831327-52b75.firebasestorage.app",
  messagingSenderId: "630199541875",
  appId: "1:630199541875:web:c15e28fff341c01c050a06",
};

function createFirebaseApp(config: FirebaseOptions) {
  if (!config.apiKey) {
    // This will now only happen if the hardcoded config is removed/emptied.
    console.error("CRITICAL: Firebase configuration is missing.");
    return { options: {} } as any; 
  }
  
  // Initialize Firebase only if it hasn't been initialized yet.
  if (getApps().length) {
    return getApp();
  }

  return initializeApp(config);
}

// Export the initialized app instance.
export const firebaseApp = createFirebaseApp(firebaseConfig);
