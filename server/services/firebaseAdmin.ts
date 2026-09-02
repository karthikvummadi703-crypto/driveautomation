import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let firebaseApp: App | null = null;

export function getFirebaseAdmin(): App {
  if (firebaseApp) return firebaseApp;

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    'n8nsampleproject-ff2c5';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    firebaseApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    firebaseApp = initializeApp({ projectId });
  }

  return firebaseApp;
}

export function getAdminAuth() {
  return getAuth(getFirebaseAdmin());
}

export function getAdminFirestore() {
  return getFirestore(getFirebaseAdmin());
}
