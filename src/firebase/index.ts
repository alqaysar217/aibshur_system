import { firebaseApp } from './config';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

let auth: Auth;
let firestore: Firestore;

function initializeFirebase() {
    if (!auth) auth = getAuth(firebaseApp);
    if (!firestore) firestore = getFirestore(firebaseApp);
    
    return { auth, firestore, app: firebaseApp };
}

export { initializeFirebase };
export * from './provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './error-emitter';
export * from './errors';
