'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import type { User as AppUser } from '@/lib/types';
import { mockAdminUser } from '@/lib/mock-data';

interface UseUserHook {
  user: FirebaseAuthUser | null;
  userData: AppUser | null;
  loading: boolean;
}

// Dev-only: Set this to true to bypass Firebase Auth and use mockAdminUser
const DEV_AUTH_BYPASS_ENABLED = process.env.NODE_ENV === 'development';

export function useUser(): UseUserHook {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If bypass is enabled, we immediately set the user to our mock admin
    // and skip the entire Firebase authentication flow.
    if (DEV_AUTH_BYPASS_ENABLED) {
      console.warn(
        '%c🔒 DEV MODE: Auth Bypassed 🔒',
        'color: #ffb300; font-weight: bold; background-color: #333; padding: 4px; border-radius: 4px;',
        'Using mock admin user.'
      );
      
      // We need to create a mock object that looks like a real FirebaseAuthUser
      const mockFirebaseAuthUser = {
        uid: mockAdminUser.uid,
        phoneNumber: mockAdminUser.phone,
        displayName: mockAdminUser.full_name,
        email: mockAdminUser.email,
        photoURL: mockAdminUser.profile_image,
        // Add other properties if your app needs them, otherwise null is fine
        providerId: 'password',
        emailVerified: true,
      } as FirebaseAuthUser;

      setUser(mockFirebaseAuthUser);
      setUserData(mockAdminUser);
      setLoading(false);
      return; // This is crucial: we stop here and don't attach the real listener.
    }

    // This is the original logic for production
    if (!auth || !firestore) {
        return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        const userDocRef = doc(firestore, 'users', authUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserData({ uid: userDoc.id, ...userDoc.data() } as AppUser);
        } else {
          setUserData(null);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return { user, userData, loading };
}
