'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import type { User as AppUser } from '@/lib/types';

interface UseUserHook {
  user: FirebaseAuthUser | null;
  userData: AppUser | null;
  loading: boolean;
}

export function useUser(): UseUserHook {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
        // Firebase might not be initialized yet
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
          // User is authenticated but no data in Firestore yet.
          // This happens during registration.
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
