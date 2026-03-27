import { FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function createFirebaseApp(config: FirebaseOptions) {
  if (!config.apiKey || config.apiKey === 'YOUR_API_KEY') {
    // Return a dummy object with empty options if config is missing or has placeholder values.
    // Our FirebaseClientProvider will check this and show an error message.
    // This prevents server-side crashes on import.
    return { options: {} } as any;
  }
  
  // getApps() returns an array of all initialized apps.
  // If it's not empty, we get the default app to avoid re-initialization errors.
  if (getApps().length) {
    return getApp();
  }

  // Otherwise, initialize a new app.
  return initializeApp(config);
}

// It's okay to expose this configuration to the client.
// Firebase security rules are used to protect your data.
export const firebaseApp = createFirebaseApp(firebaseConfig);
