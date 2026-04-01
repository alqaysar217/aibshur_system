'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, getDocs, Query, DocumentData } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface UseCollectionOptions {
    fetchOnce?: boolean;
    collectionPath?: string;
}

interface UseCollectionResponse<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
}

export function useCollection<T extends DocumentData>(
  query: Query | null,
  options?: UseCollectionOptions
): UseCollectionResponse<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { fetchOnce, collectionPath } = options || {};

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    // Default to fetching once. Only use onSnapshot if fetchOnce is explicitly false.
    if (fetchOnce !== false) {
        const fetchData = async () => {
            try {
                const snapshot = await getDocs(query);
                const docs = snapshot.docs.map(
                    (doc) => ({ ...doc.data(), id: doc.id } as T)
                );
                setData(docs);
                setError(null);
            } catch (err: any) {
                console.error("Error in useCollection (fetchOnce):", err);
                if (err.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: collectionPath || `(Unknown collection)`,
                        operation: 'list'
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
        return () => {}; // For fetchOnce, there's no listener to unsubscribe from.
    } else { // fetchOnce is explicitly false, so use real-time updates.
        const unsubscribe = onSnapshot(
          query,
          (snapshot) => {
            const docs = snapshot.docs.map(
              (doc) => ({ ...doc.data(), id: doc.id } as T)
            );
            setData(docs);
            setLoading(false);
            setError(null);
          },
          (err) => {
            console.error("Error in useCollection (onSnapshot):", err);
            if (err.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: collectionPath || `(Unknown collection)`,
                    operation: 'list'
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
  }, [query, fetchOnce, collectionPath]);

  return { data, loading, error };
}
