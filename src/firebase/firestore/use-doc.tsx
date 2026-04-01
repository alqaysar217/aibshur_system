'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, getDoc, DocumentReference, DocumentData } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface UseDocOptions {
    fetchOnce?: boolean;
}

interface UseDocResponse<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useDoc<T extends DocumentData>(
  docRef: DocumentReference | null,
  options?: UseDocOptions
): UseDocResponse<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { fetchOnce } = options || {};


  useEffect(() => {
    if (!docRef) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // Default to fetching once. Only use onSnapshot if fetchOnce is explicitly false.
    if (fetchOnce !== false) {
        const fetchData = async () => {
            try {
                const snapshot = await getDoc(docRef);
                if (snapshot.exists()) {
                    const docData = { ...snapshot.data(), id: snapshot.id } as T;
                    setData(docData);
                } else {
                    setData(null);
                }
                setError(null);
            } catch (err: any) {
                console.error("Error in useDoc (fetchOnce):", err);
                 if (err.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: docRef.path,
                        operation: 'get'
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    setError(permissionError);
                } else {
                    setError(err);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        return () => {};
    } else { // fetchOnce is explicitly false, so use real-time updates.
        const unsubscribe = onSnapshot(
          docRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const docData = { ...snapshot.data(), id: snapshot.id } as T;
              setData(docData);
            } else {
              setData(null);
            }
            setLoading(false);
            setError(null);
          },
          (err) => {
            console.error("Error in useDoc (onSnapshot):", err);
            if (err.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'get'
                });
                errorEmitter.emit('permission-error', permissionError);
                setError(permissionError);
            } else {
                setError(err);
            }
            setLoading(false);
          }
        );
        return () => unsubscribe();
    }
  }, [docRef, fetchOnce]);

  return { data, loading, error };
}
