import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuthContext } from './AuthContext';
import {
  clearDriveToken,
  completeRedirectConnect,
  getDriveAccessToken,
  getStoredDriveToken,
  type DriveStorageQuota,
} from '@/services/driveService';
import { updateUserProfile } from '@/services/firestoreService';
import { aiApi } from '@/services/aiService';

interface DriveContextValue {
  driveLoading: boolean;
  connected: boolean;
  driveEmail: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getAccessToken: () => Promise<string>;
  storageUsedBytes: number;
  storageQuotaBytes: number | null;
  storagePercentage: number;
  storageLoading: boolean;
  storageUnlimited: boolean;
  refreshStorage: () => Promise<void>;
}

const DriveContext = createContext<DriveContextValue | null>(null);

export function DriveProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuthContext();
  const [driveLoading, setDriveLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [storageQuota, setStorageQuota] = useState<DriveStorageQuota | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  // Ref so the init effect can call refreshStorage without adding it to its deps.
  const refreshStorageRef = useRef<() => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    if (!user) {
      setConnected(false);
      setDriveEmail(null);
      setStorageQuota(null);
      setDriveLoading(false);
      return;
    }
    let cancelled = false;
    setDriveLoading(true);

    // Immediately show Drive as connected if the user profile says so.
    // This gives instant UI feedback before the async token fetch completes.
    const profileDriveEmail = profile?.connectedDriveEmail ?? null;
    if (profileDriveEmail) {
      setConnected(true);
      setDriveEmail(profileDriveEmail);
    }

    void (async () => {
      try {
        // If the user just returned from a Google redirect-based Drive connect,
        // finalize it (persist the token) before reading the stored token.
        const redirectRecord = await completeRedirectConnect();
        if (cancelled) return;
        if (redirectRecord) {
          setConnected(true);
          setDriveEmail(redirectRecord.driveEmail ?? null);
          void refreshStorageRef.current();
          return;
        }
        // Load the stored token from localStorage/Firestore. Only mark connected
        // if there is a real token — never fall back to the user's login email.
        const record = await getStoredDriveToken(user.uid);
        if (cancelled) return;
        if (record) {
          setConnected(true);
          // Prefer the stored token's driveEmail, fall back to profile's saved email.
          setDriveEmail(record.driveEmail ?? profileDriveEmail);
          // Token is now confirmed — fetch real Drive storage quota.
          void refreshStorageRef.current();
        } else if (profileDriveEmail) {
          // No fresh token right now, but the profile says Drive was connected
          // before — leave connected=true so an upload can refresh lazily.
        } else {
          // No token in localStorage/Firestore and no saved driveEmail. The
          // authoritative server store (which persists across devices and holds
          // the refresh token) may still have a connection — e.g. right after a
          // Google sign-in / server OAuth redirect, or on a second device. Query
          // /api/drive/status so the UI reflects the true server-side state.
          try {
            const status = await aiApi.getDriveStatus();
            if (cancelled) return;
            if (status.connected) {
              setConnected(true);
              setDriveEmail(status.driveEmail ?? null);
              void refreshStorageRef.current();
            } else {
              setConnected(false);
              setDriveEmail(null);
            }
          } catch {
            if (cancelled) return;
            setConnected(false);
            setDriveEmail(null);
          }
        }
        // If there's no fresh token but profile has driveEmail, leave connected=true
        // (set above). The token will be refreshed lazily when an upload is attempted.
      } finally {
        if (!cancelled) setDriveLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const refreshStorage = useCallback(async () => {
    if (!user) return;
    setStorageLoading(true);
    try {
      // Fetch quota via the backend, which refreshes expired access tokens
      // server-side (using the stored refresh token) and caches results. This
      // avoids calling the Google API directly from the browser, which would
      // fail silently once a short-lived access token expires.
      const storage = await aiApi.getDriveStorage();
      setStorageQuota({
        limit: storage.limit,
        usage: storage.usage,
        usageInDrive: storage.usageInDrive,
        usageInDriveTrash: storage.usageInDriveTrash ?? 0,
      });
    } catch (err) {
      console.warn('[driveContext] refreshStorage error:', err);
      setStorageQuota(null);
    } finally {
      setStorageLoading(false);
    }
  }, [user]);

  // Keep the ref in sync so the init effect can always call the latest version.
  refreshStorageRef.current = refreshStorage;

  useEffect(() => {
    if (!connected) {
      setStorageQuota(null);
      return;
    }
    void refreshStorage();
  }, [connected, refreshStorage]);

  const connect = useCallback(async () => {
    if (!user) throw new Error('You must be signed in.');
    setConnecting(true);
    try {
      const token = await getDriveAccessToken();
      setConnected(Boolean(token));
      // Re-read the stored record to get the correct driveEmail (set by getDriveAccessToken).
      const record = await getStoredDriveToken(user.uid);
      const email = record?.driveEmail ?? null;
      setDriveEmail(email);
      // Persist the connected Drive email to the user profile so it survives
      // token expiry and is restored on next login without re-fetching a token.
      if (email) {
        try {
          await updateUserProfile(user.uid, { connectedDriveEmail: email });
        } catch {
          // Non-fatal: Drive is still connected for this session.
        }
      }
    } catch (error) {
      // Enhance error message with OAuth verification guidance
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('unverified') || errorMessage.includes('hasn\'t been verified')) {
          throw new Error(
            'Google requires app verification. Please click "Advanced" → "Go to DriveFlow (unsafe)" to proceed. This is normal during development. To remove this screen, add your email as a test user in Google Cloud Console or submit the app for verification.'
          );
        }
      }
      throw error;
    } finally {
      setConnecting(false);
    }
  }, [user]);

  const disconnect = useCallback(async () => {
    if (!user) return;
    // Clear the server-side credential store FIRST so the refresh token is
    // revoked for this user across all devices (prevents resurrecting the
    // connection from another device after the user explicitly disconnects).
    try {
      await aiApi.disconnectDrive();
    } catch {
      // Non-fatal for the local session — local cleanup still proceeds.
    }
    await clearDriveToken(user.uid);
    setConnected(false);
    setDriveEmail(null);
    setStorageQuota(null);
    // Clear the persisted Drive email from the user profile so the next login
    // correctly shows Drive as not connected.
    try {
      await updateUserProfile(user.uid, { connectedDriveEmail: null });
    } catch {
      // Non-fatal.
    }
  }, [user]);

  const getAccessToken = useCallback(() => getDriveAccessToken(), []);

  const storageUsedBytes = storageQuota?.usage ?? 0;
  const storageUnlimited = storageQuota !== null && storageQuota.limit <= 0;
  const storageQuotaBytes =
    storageQuota && storageQuota.limit > 0 ? storageQuota.limit : null;
  const storagePercentage =
    storageQuota && storageQuota.limit > 0
      ? Math.min(100, Math.round((storageQuota.usage / storageQuota.limit) * 1000) / 10)
      : 0;

  const value = useMemo<DriveContextValue>(
    () => ({
      driveLoading,
      connected,
      driveEmail,
      connecting,
      connect,
      disconnect,
      getAccessToken,
      storageUsedBytes,
      storageQuotaBytes,
      storagePercentage,
      storageLoading,
      storageUnlimited,
      refreshStorage,
    }),
    [
      driveLoading,
      connected,
      driveEmail,
      connecting,
      connect,
      disconnect,
      getAccessToken,
      storageUsedBytes,
      storageQuotaBytes,
      storagePercentage,
      storageLoading,
      storageUnlimited,
      refreshStorage,
    ],
  );

  return <DriveContext.Provider value={value}>{children}</DriveContext.Provider>;
}

export function useDriveContext(): DriveContextValue {
  const context = useContext(DriveContext);
  if (!context) throw new Error('useDriveContext must be used within a DriveProvider.');
  return context;
}
