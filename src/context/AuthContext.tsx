import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import { authService, extractGoogleAccessToken } from '@/firebase/auth';
import {
  createUserProfile,
  getUserProfile,
  updateUserProfile as persistUserProfile,
} from '@/services/firestoreService';
import { autoConnectFromGoogleSignIn } from '@/services/driveService';
import { DEFAULT_USER_SETTINGS } from '@/config/constants';
import type { UserProfile, UserProfilePatch } from '@/types/auth';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  profileLoading: boolean;
  isGoogleUser: boolean;
  canUpload: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: UserProfilePatch) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function createDefaultProfile(user: User): UserProfile {
  const provider =
    user.providerData[0]?.providerId === 'google.com' ? 'google.com' : 'password';
  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName?.trim() || user.email?.split('@')[0] || 'DriveFlow User',
    photoURL: user.photoURL,
    provider,
    createdAt: new Date().toISOString(),
    settings: { ...DEFAULT_USER_SETTINGS },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      let nextProfile = await getUserProfile(user.uid);
      if (!nextProfile) {
        nextProfile = createDefaultProfile(user);
        await createUserProfile(user.uid, nextProfile);
      } else if (nextProfile.provider === 'google.com') {
        const patch: UserProfilePatch = {};
        if (user.displayName && user.displayName !== nextProfile.displayName) {
          patch.displayName = user.displayName;
        }
        if (user.photoURL && user.photoURL !== nextProfile.photoURL) {
          patch.photoURL = user.photoURL;
        }
        if (Object.keys(patch).length > 0) {
          await persistUserProfile(user.uid, patch);
          nextProfile = { ...nextProfile, ...patch };
        }
      }
      setProfile(nextProfile);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const signInWithGoogle = useCallback(async () => {
    const credential = await authService.signInWithGoogle();
    // Auto-connect Drive: the Google sign-in popup already grants Drive scope,
    // so we persist the access token immediately — no separate "Connect" step needed.
    const accessToken = extractGoogleAccessToken(credential);
    if (accessToken && credential.user) {
      const driveEmail =
        credential.user.providerData.find((p) => p.providerId === 'google.com')?.email ??
        credential.user.email ??
        null;
      // Save Drive token to localStorage + Firestore driveTokens collection.
      void autoConnectFromGoogleSignIn(credential.user.uid, accessToken, driveEmail);
      // Also persist the Drive email in the user profile so DriveContext can
      // restore the "connected" state instantly on any future login without
      // needing a valid access token in hand.
      if (driveEmail) {
        try {
          await persistUserProfile(credential.user.uid, { connectedDriveEmail: driveEmail });
        } catch {
          // Non-fatal — DriveContext will still restore on token fetch.
        }
      }
    }
    await refreshProfile();
  }, [refreshProfile]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await authService.signInWithEmail(email, password);
    await refreshProfile();
  }, [refreshProfile]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    await authService.registerWithEmail(email, password);
    await authService.updateDisplayName(name);
    await refreshProfile();
  }, [refreshProfile]);

  const resetPassword = useCallback(async (email: string) => {
    await authService.resetPassword(email);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setProfile(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: UserProfilePatch) => {
      if (!user || !profile) throw new Error('You must be signed in.');
      await persistUserProfile(user.uid, patch);
      setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    [user, profile],
  );

  const isGoogleUser = profile?.provider === 'google.com';

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      authLoading,
      profileLoading,
      isGoogleUser,
      // Any signed-in user can upload as long as they have a Drive token connected.
      // The DriveContext is the actual gate — if there's no valid token, uploads fail
      // with a clear error. We do NOT restrict by provider type here.
      canUpload: Boolean(user),
      signInWithGoogle,
      signInWithEmail,
      register,
      resetPassword,
      signOut,
      refreshProfile,
      updateProfile,
    }),
    [
      user,
      profile,
      authLoading,
      profileLoading,
      isGoogleUser,
      signInWithGoogle,
      signInWithEmail,
      register,
      resetPassword,
      signOut,
      refreshProfile,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within an AuthProvider.');
  return context;
}
