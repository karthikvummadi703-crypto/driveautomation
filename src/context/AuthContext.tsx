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
import { authService } from '@/firebase/auth';
import {
  createUserProfile,
  getUserProfile,
  updateUserProfile as persistUserProfile,
} from '@/services/firestoreService';
import { DEFAULT_USER_SETTINGS } from '@/config/constants';
import type { UserProfile, UserProfilePatch } from '@/types/auth';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  profileLoading: boolean;
  isGoogleUser: boolean;
  isEmailVerified: boolean;
  canUpload: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
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
    await authService.signInWithGoogle();
    await refreshProfile();
  }, [refreshProfile]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await authService.signInWithEmail(email, password);
    await refreshProfile();
  }, [refreshProfile]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const credential = await authService.registerWithEmail(email, password);
    await authService.updateDisplayName(name);
    // Use the UserCredential.user directly — avoids auth.currentUser timing lag.
    await authService.sendVerificationEmailForUser(credential.user);
    await refreshProfile();
  }, [refreshProfile]);

  const sendVerificationEmail = useCallback(async () => {
    await authService.sendVerificationEmail();
  }, []);

  const reloadUser = useCallback(async () => {
    await authService.reloadUser();
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
  const isEmailVerified = Boolean(
    user && (isGoogleUser || user.emailVerified)
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      authLoading,
      profileLoading,
      isGoogleUser,
      isEmailVerified,
      canUpload: Boolean(user),
      signInWithGoogle,
      signInWithEmail,
      register,
      sendVerificationEmail,
      reloadUser,
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
      isEmailVerified,
      signInWithGoogle,
      signInWithEmail,
      register,
      sendVerificationEmail,
      reloadUser,
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
