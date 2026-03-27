'use client';
import React, { ReactNode, useMemo } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from '@/firebase';
import { firebaseApp } from './config';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const isFirebaseConfigured = !!firebaseApp.options.apiKey;

  const firebaseInstances = useMemo(() => {
    if (isFirebaseConfigured) {
      return initializeFirebase();
    }
    return { app: null, auth: null, firestore: null };
  }, [isFirebaseConfigured]);

  // Only show the error on the client side.
  if (typeof window !== 'undefined' && !isFirebaseConfigured) {
    // This condition will now only be met if the .env.local file is missing or empty.
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background text-foreground p-4">
            <div className="w-full max-w-lg rounded-lg border bg-card p-8 text-center text-card-foreground">
                <h1 className="text-2xl font-bold text-destructive">Firebase Not Configured</h1>
                <p className="mt-4 text-muted-foreground">
                    Your Firebase API keys are missing. Please add your Firebase project credentials to a
                    <code className="mx-2 rounded bg-muted px-1 py-0.5 font-mono">.env.local</code>
                    file at the root of your project and restart the development server.
                </p>
                <div className="mt-6 rounded-md bg-muted p-4 text-left text-xs text-muted-foreground">
                    <pre className="overflow-auto">
                        <code>
{`NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."`}
                        </code>
                    </pre>
                </div>
                 <p className="mt-4 text-sm text-muted-foreground">
                    You can find these credentials in your Firebase project settings under "Your apps".
                </p>
            </div>
        </div>
    );
  }

  return (
    <FirebaseProvider {...firebaseInstances}>
      {children}
    </FirebaseProvider>
  );
}
