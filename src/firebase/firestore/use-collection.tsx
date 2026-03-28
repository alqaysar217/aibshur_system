'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, Query, DocumentData } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface UseCollectionResponse<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
}

export function useCollection<T extends DocumentData>(
  query: Query | null,
  collectionPath?: string // New parameter
): UseCollectionResponse<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }
    setLoading(true);

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
        console.error("Error in useCollection:", err); // Keep for general debugging
        if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                // Use the provided path, or a placeholder if not provided
                path: collectionPath || `(Unknown collection)`,
                operation: 'list'
            });
            errorEmitter.emit('permission-error', permissionError);
            setError(permissionError); // Also set it in local state for the component
        } else {
            setError(err);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query, collectionPath]); // Add collectionPath to dependencies

  return { data, loading, error };
}
