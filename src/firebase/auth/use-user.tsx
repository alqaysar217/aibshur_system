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

// --- DEVELOPMENT ONLY ---
// Set this to `false` to use real Firebase Authentication.
const MOCK_AUTH_ENABLED = true;

export function useUser(): UseUserHook {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // --- MOCK AUTH LOGIC ---
    if (MOCK_AUTH_ENABLED) {
        // Use a mock user for development to bypass login.
        // The mock user has full admin privileges.
        setUserData(mockAdminUser);
        // Create a fake FirebaseAuthUser object
        setUser({ uid: mockAdminUser.uid } as FirebaseAuthUser);
        setLoading(false);
        return; // Skip real auth logic
    }

    // --- REAL AUTH LOGIC ---
    if (!auth || !firestore) {
        setLoading(false);
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
          // This case is for new users who haven't completed registration
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
