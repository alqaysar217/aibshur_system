'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error(error); // Also log it for devs
      
      // In a development environment, we throw the error to show the Next.js error overlay.
      if (process.env.NODE_ENV === 'development') {
        // This makes the Next.js dev overlay appear with the detailed error.
        throw error;
      }

      // In production, you might want to show a generic toast message.
      toast({
        variant: 'destructive',
        title: 'خطأ في الأذونات',
        description: 'ليس لديك الإذن للقيام بهذا الإجراء.',
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
