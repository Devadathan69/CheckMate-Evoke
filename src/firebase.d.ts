
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseApp } from 'firebase/app';

export const auth: Auth | null;
export const db: Firestore | null;
export const isFirebaseConfigured: boolean;
declare const app: FirebaseApp;
export default app;
