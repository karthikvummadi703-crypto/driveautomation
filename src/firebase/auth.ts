import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Unsubscribe,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './app';
import { GOOGLE_DRIVE_SCOPE } from '@/config/constants';

const googleSignInProvider = () => {
  const provider = new GoogleAuthProvider();
  // Request Drive scope at sign-in so the resulting access token grants Drive
  // access. This lets us auto-connect Drive immediately after Google login
  // without requiring a separate "Connect Drive" step.
  provider.addScope(GOOGLE_DRIVE_SCOPE);
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
};

/** Extract the Google OAuth access token from a successful sign-in result. */
export function extractGoogleAccessToken(credential: UserCredential): string | null {
  const cred = GoogleAuthProvider.credentialFromResult(credential);
  return cred?.accessToken ?? null;
}

export const authService = {
  signInWithGoogle: (): Promise<UserCredential> =>
    signInWithPopup(auth, googleSignInProvider()),

  signInWithEmail: (email: string, password: string): Promise<UserCredential> =>
    signInWithEmailAndPassword(auth, email.trim(), password),

  registerWithEmail: (email: string, password: string): Promise<UserCredential> =>
    createUserWithEmailAndPassword(auth, email.trim(), password),

  resetPassword: (email: string): Promise<void> => sendPasswordResetEmail(auth, email.trim()),

  updateDisplayName: (displayName: string): Promise<void> => {
    if (!auth.currentUser) return Promise.reject(new Error('No signed-in user.'));
    return updateProfile(auth.currentUser, { displayName: displayName.trim() });
  },

  updatePhotoURL: (photoURL: string): Promise<void> => {
    if (!auth.currentUser) return Promise.reject(new Error('No signed-in user.'));
    return updateProfile(auth.currentUser, { photoURL });
  },

  signOut: (): Promise<void> => signOut(auth),

  onAuthStateChanged: (callback: (user: User | null) => void): Unsubscribe =>
    onAuthStateChanged(auth, callback),
};
