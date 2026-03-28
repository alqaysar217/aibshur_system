import { FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';

// Hardcoded Firebase config as a final debugging step.
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBGsKSyhMg7j9gdp1nleEkADhkuQPvqutM",
  authDomain: "studio-493831327-52b75.firebaseapp.com",
  projectId: "studio-493831327-52b75",
  storageBucket: "studio-493831327-52b75.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "493831327527", // Fallback
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:493831327527:web:2f8b8e7c1d3a4b5c6d7e8f", // Fallback
};

function createFirebaseApp(config: FirebaseOptions) {
  // This check is now less likely to fail with hardcoded values, but good practice to keep.
  if (!config.apiKey) {
    return { options: {} } as any;
  }
  
  if (getApps().length) {
    return getApp();
  }

  return initializeApp(config);
}

export const firebaseApp = createFirebaseApp(firebaseConfig);
