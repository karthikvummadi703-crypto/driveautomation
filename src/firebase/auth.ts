import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
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

/**
 * Action code settings so the email verification link returns the user back
 * into the app (in-app handling) instead of landing on Firebase's default
 * action page. The target URL goes to the app root; ProtectedRoute will route
 * the now-verified user appropriately.
 */
function getVerificationActionCodeSettings(): {
  url: string;
  handleCodeInApp: true;
} {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : undefined;
  const baseUrl = origin || (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:3000';
  return {
    url: `${baseUrl.replace(/\/$/, '')}/verify-email`,
    handleCodeInApp: true,
  };
}

const googleSignInProvider = () => {
  // The Google sign-in flow handles DriveFlow authentication ONLY. Drive
  // authorization is a separate OAuth flow (via Google Identity Services) that
  // requests the Drive scopes with `access_type: offline`, so a refresh token
  // can be obtained and stored server-side for cross-device persistence.
  const provider = new GoogleAuthProvider();
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

  sendVerificationEmail: (): Promise<void> => {
    if (!auth.currentUser) return Promise.reject(new Error('No signed-in user.'));
    return sendEmailVerification(auth.currentUser, getVerificationActionCodeSettings());
  },

  /** Send verification to a specific User object — avoids auth.currentUser timing race after registration. */
  sendVerificationEmailForUser: (user: User): Promise<void> =>
    sendEmailVerification(user, getVerificationActionCodeSettings()),

  reloadUser: (): Promise<void> => {
    if (!auth.currentUser) return Promise.reject(new Error('No signed-in user.'));
    return auth.currentUser.reload();
  },

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

