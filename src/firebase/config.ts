import { FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';

// This configuration is now loaded from environment variables.
// See the .env file.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This function creates the Firebase app instance.
// It's designed to be idempotent, so it won't re-initialize the app if it already exists.
function createFirebaseApp(config: FirebaseOptions) {
  // The client provider will show a user-friendly error if the config is missing.
  if (!config.apiKey) {
    return { options: {} } as any; 
  }
  
  if (getApps().length) {
    return getApp();
  }

  return initializeApp(config);
}

// Export the initialized app instance.
export const firebaseApp = createFirebaseApp(firebaseConfig);
