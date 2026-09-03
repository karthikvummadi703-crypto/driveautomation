import dns from 'node:dns';
import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// On Windows, Node's default "happy-eyeballs" resolution can prefer IPv6 and
// wait for IPv6 timeouts before trying IPv4, which makes Firebase Admin
// (Firestore/Auth) calls hang for many seconds. Force IPv4-first BEFORE the
// first Firestore connection. This must be set before initializeApp — but
// firebase-admin connects lazily on the first operation, so setting it here
// (top of this module) is guaranteed to run in time.
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

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
