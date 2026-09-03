# DriveFlow Repair — Implementation Plan

**Date:** 2026-09-03
**Status:** Awaiting approval — no code changes made

---

## Target Architecture

### Identity vs. Authorization Separation

```
DriveFlow User Identity          Google Drive Authorization
─────────────────────            ──────────────────────────
Firebase Authentication          Google OAuth 2.0 (separate flow)
  - email/password                 - drive.file scope
  - Google sign-in                 - drive.metadata.readonly scope
  - UID = primary key              - drive.activity.readonly scope
                                   - Refresh token = long-lived credential
                                   - Access token = short-lived (~1 hour)
```

These are **two independent authorizations**. Firebase Auth identifies the DriveFlow user. Google OAuth grants Drive access. They are linked by the `uid` key in Firestore.

### Data Flow: Connection (First Time)

```
1. User clicks "Connect Google Drive"
2. Frontend loads GIS script, creates token client with Drive scopes
3. GIS opens consent popup → user grants access
4. GIS returns: { access_token, refresh_token, expires_in }
5. Frontend POSTs both tokens to backend: POST /api/drive/connect
6. Backend stores:
     driveTokens/{uid}       → accessToken, expiresAt, driveEmail (NO refreshToken)
     driveTokensServer/{uid} → accessToken, refreshToken, expiresAt
7. Backend responds: { connected: true, driveEmail }
8. Frontend caches accessToken locally (55 min TTL)
9. Frontend updates user profile: { connectedDriveEmail }
```

### Data Flow: Cross-Device (Second Device)

```
1. User logs in on Device B
2. DriveContext mounts → checks backend: GET /api/drive/status
3. Backend reads driveTokensServer/{uid} → finds refresh token
4. Backend returns: { connected: true, driveEmail }
5. Frontend marks Drive as connected (no token needed yet)
6. When user uploads → frontend calls POST /api/drive/token
7. Backend exchanges refresh_token for fresh access_token via Google
8. Backend returns: { accessToken } (NOT the refresh token)
9. Frontend uses access_token for direct upload to Google Drive
```

### Data Flow: Page Load (Any Device)

```
DriveContext init effect:
  → GET /api/drive/status (Firebase ID token auth)
  → If connected: mark UI as connected, fetch storage quota
  → If not connected: mark UI as disconnected
  → localStorage NOT consulted for connection status

Upload flow:
  → POST /api/drive/token (Firebase ID token auth)
  → Backend reads server store → refreshes if needed → returns access_token
  → Frontend uploads to Google Drive with access_token
```

### Token Lifecycle

```
                    ┌─────────────┐
                    │  GIS Popup  │
                    │  (connect)  │
                    └──────┬──────┘
                           │ access_token + refresh_token
                           ▼
                    ┌──────────────┐
                    │   Frontend   │
                    │  (save both) │
                    └──────┬──────┘
                           │ POST /api/drive/connect
                           ▼
                    ┌──────────────┐
                    │   Backend    │
                    │ (store both) │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
      ┌──────────┐  ┌──────────┐  ┌──────────┐
      │driveToken│  │driveToken│  │ In-Memory│
      │ s/{uid}  │  │Server/   │  │  (dev)   │
      │ (no ref) │  │  {uid}   │  │          │
      └──────────┘  └──────────┘  └──────────┘
              │            │
              ▼            ▼
      ┌─────────────────────────┐
      │   POST /api/drive/token │
      │  (returns access_token) │
      └────────────┬────────────┘
                   │ if expired:
                   ▼
      ┌─────────────────────────┐
      │  Google OAuth endpoint  │
      │  refresh_token exchange │
      └────────────┬────────────┘
                   │ new access_token
                   ▼
      ┌─────────────────────────┐
      │  Backend saves new AT   │
      │  Returns to frontend    │
      └─────────────────────────┘
```

---

## File-by-File Changes

### 1. `src/firebase/auth.ts`

| | |
|---|---|
| **Current** | `googleSignInProvider()` adds `GOOGLE_DRIVE_SCOPE` to the Google sign-in provider, so the sign-in result includes a Drive-scoped access token that `autoConnectFromGoogleSignIn()` uses as a Drive token. |
| **Proposed** | Remove `GOOGLE_DRIVE_SCOPE` from `googleSignInProvider()`. Google sign-in becomes pure authentication — no Drive scopes. The `extractGoogleAccessToken()` function is retained but no longer used in the Drive connection flow. |
| **Reason** | Firebase Auth's sign-in access token is short-lived (~1 hour), has no refresh token, and cannot be refreshed. Using it as a Drive token breaks cross-device persistence. Drive authorization must come from a separate GIS OAuth flow that returns a refresh token. |
| **Risk** | **Low.** Removing scopes from the sign-in provider only affects what the sign-in token can access. The sign-in itself continues to work. |

Specific changes:
- Delete line 23: `provider.addScope(GOOGLE_DRIVE_SCOPE);`
- Delete line 16: `import { GOOGLE_DRIVE_SCOPE } from '@/config/constants';`
- Remove comment on lines 20-22 about auto-connect
- `extractGoogleAccessToken()` — keep as-is (unused in Drive flow but harmless)

---

### 2. `src/context/AuthContext.tsx`

| | |
|---|---|
| **Current** | `signInWithGoogle()` calls `autoConnectFromGoogleSignIn()` after sign-in, saving the sign-in access token as a Drive token. Also persists `connectedDriveEmail` to the user profile. |
| **Proposed** | Remove the `autoConnectFromGoogleSignIn()` call and the `connectedDriveEmail` persistence from `signInWithGoogle()`. Sign-in becomes purely about Firebase authentication. Drive connection happens separately. |
| **Reason** | The sign-in access token is not a valid long-lived Drive credential. Auto-connecting with it creates a false "connected" state that breaks within an hour. The `connectedDriveEmail` should only be set by the proper GIS connection flow. |
| **Risk** | **Low.** Users who sign in with Google will no longer be auto-connected to Drive. They will need to click "Connect Drive" once. This is one extra click but produces a correct, persistent connection. |

Specific changes in `signInWithGoogle` callback (lines 107-125):
- Remove lines 109-122 (the `extractGoogleAccessToken` → `autoConnectFromGoogleSignIn` → `persistUserProfile` block)
- Keep `await refreshProfile()` at the end
- Remove `autoConnectFromGoogleSignIn` from imports (line 17)
- Remove `extractGoogleAccessToken` from imports (line 11)

---

### 3. `src/services/driveService.ts`

| | |
|---|---|
| **Current** | 480 lines. Contains `autoConnectFromGoogleSignIn()`, `connectWithGis()`, `getStoredDriveToken()` (localStorage→Firestore→server cascade), `getDriveAccessToken()` (full flow with GIS/redirect fallback), `refreshFromServer()`, and `completeRedirectConnect()`. |
| **Proposed** | Remove `autoConnectFromGoogleSignIn()`. Update `connectWithGis()` to also persist tokens to the backend via new API call. Update `refreshFromServer()` to cache refresh token locally. Update `getStoredDriveToken()` to prefer backend status. Keep `getDriveAccessToken()` and `completeRedirectConnect()` with minor fixes. |
| **Reason** | The core fix: after GIS returns tokens, send them to the backend. The backend becomes the source of truth for Drive connection state. localStorage becomes a performance cache, not the authority. |
| **Risk** | **Medium.** This is the largest change. Multiple functions are modified. Thorough testing of all token paths is required. |

Specific changes:

**a) Delete `autoConnectFromGoogleSignIn()` (lines 104-128)**
Remove entirely. This function saves the sign-in token as a Drive token — the root cause of the cross-device bug.

**b) Add import for `aiApi` and add `saveTokensToServer()` helper**
```typescript
// After the existing driveApiClient definition, add:
async function saveTokensToServer(
  uid: string,
  accessToken: string,
  refreshToken: string | null,
  driveEmail: string | null,
): Promise<void> {
  try {
    await aiApi.saveDriveTokens(accessToken, refreshToken, driveEmail);
  } catch {
    // Non-fatal — local cache still works for this session
  }
}
```

**c) Update `connectWithGis()` (lines 226-264)**
After resolving the GIS token response, persist to backend:
- Add a new parameter: `uid: string`
- After the `resolve()` call, add `await saveTokensToServer(uid, accessToken, refreshToken, driveEmail)`
- Actually, since `connectWithGis` returns a Promise, the persistence should happen in the caller (`getDriveAccessToken`) after calling `connectWithGis`. Keep `connectWithGis` as a pure token-getter.

**d) Update `getDriveAccessToken()` (lines 353-411)**
After the GIS path obtains tokens (line 370-386), add backend persistence:
```typescript
// After cacheDriveAccessToken(...):
await saveTokensToServer(user.uid, accessToken, refreshToken ?? null, driveEmail);
```

**e) Update `refreshFromServer()` (lines 334-351)**
When the backend returns a new access token, also capture the refresh token if available:
- Call an updated `aiApi.refreshDriveToken()` that returns `{ accessToken, refreshToken? }`
- Store the refresh token in the local `StoredDriveToken` so subsequent refreshes can use it
- This is important for the fallback path when backend refresh fails

**f) Update `completeRedirectConnect()` (lines 418-454)**
After caching the redirect result, persist to backend:
- Add `await saveTokensToServer(user.uid, credential.accessToken, null, driveEmail);`
- Note: the redirect flow via Firebase may not return refresh tokens. This is acceptable because the redirect flow is a fallback; the primary flow is GIS.

**g) Remove `DRIVE_API_ENABLE_URL` hardcoded project ID (line 29-30)**
Replace with:
```typescript
const DRIVE_API_ENABLE_URL = import.meta.env.VITE_DRIVE_API_ENABLE_URL
  || 'https://console.developers.google.com/apis/api/drive.googleapis.com/overview';
```

**h) Remove debug console.log (line 238)**
Delete: `console.log('[drive] origin=', ...);`

---

### 4. `src/services/aiService.ts`

| | |
|---|---|
| **Current** | Contains `refreshDriveToken()` which calls `POST /api/drive/token` and returns `data.accessToken`. |
| **Proposed** | Add `saveDriveTokens()` method to send tokens to the new `POST /api/drive/connect` endpoint. Update `refreshDriveToken()` to also return `refreshToken` if the backend includes it. |
| **Reason** | The frontend needs to send tokens to the backend after GIS consent, and needs the refresh token from the backend for local caching. |
| **Risk** | **Low.** Adding a new method and updating a return type. |

Specific changes:

**a) Add `saveDriveTokens()` method:**
```typescript
async saveDriveTokens(
  accessToken: string,
  refreshToken: string | null,
  driveEmail: string | null,
) {
  const { data } = await apiClient.post(
    `${BACKEND_URL}/api/drive/connect`,
    { accessToken, refreshToken, driveEmail },
    { headers: await this.authHeaders() },
  );
  return data as { connected: boolean; driveEmail: string | null };
},
```

**b) Update `refreshDriveToken()` return type:**
```typescript
async refreshDriveToken() {
  const { data } = await apiClient.post(
    `${BACKEND_URL}/api/drive/token`,
    {},
    { headers: await this.authHeaders() },
  );
  return data as { accessToken: string; refreshToken?: string };
},
```

---

### 5. `src/services/firestoreService.ts`

| | |
|---|---|
| **Current** | Contains `getDriveToken()`, `saveDriveToken()`, `deleteDriveToken()` which operate on the frontend `driveTokens` Firestore collection. |
| **Proposed** | No changes. Keep these functions for backward compatibility. The new flow primarily uses the backend API, but these Firestore functions are still used as a fallback in `getStoredDriveToken()`. |
| **Reason** | Removing them would break the existing fallback chain. They become less critical but are harmless to keep. |
| **Risk** | **None.** No changes. |

---

### 6. `src/context/DriveContext.tsx`

| | |
|---|---|
| **Current** | Init effect (lines 53-109) checks localStorage→Firestore→server via `getStoredDriveToken()`. `connect()` calls `getDriveAccessToken()`. `disconnect()` clears localStorage and Firestore. |
| **Proposed** | Init effect: add a backend status check (`GET /api/drive/status`) as the **first** check, before `getStoredDriveToken()`. If backend says connected, skip localStorage. `connect()` stays the same (calls `getDriveAccessToken()` which now handles backend persistence). `disconnect()` stays the same plus calls backend disconnect endpoint. |
| **Reason** | Backend is the source of truth for Drive connection state. Checking it first ensures cross-device correctness. |
| **Risk** | **Medium.** Changing the init flow affects every page load. Must not introduce flickering or race conditions. |

Specific changes in the init effect (lines 72-103):

Replace the body of the async IIFE:
```typescript
void (async () => {
  try {
    // 1. Check redirect result (if user just returned from Google redirect)
    const redirectRecord = await completeRedirectConnect();
    if (cancelled) return;
    if (redirectRecord) {
      setConnected(true);
      setDriveEmail(redirectRecord.driveEmail ?? null);
      void refreshStorageRef.current();
      return;
    }

    // 2. Check backend status (source of truth for cross-device)
    try {
      const { data } = await apiClient.get(
        `${aiApi.baseUrl}/api/drive/status`,
        { headers: await aiApi.authHeaders() },
      );
      if (cancelled) return;
      if (data.connected) {
        setConnected(true);
        setDriveEmail(data.driveEmail ?? profileDriveEmail);
        void refreshStorageRef.current();
        return;
      }
    } catch {
      // Backend unavailable — fall through to local check
    }

    // 3. Fallback: local token (for offline/dev scenarios)
    const record = await getStoredDriveToken(user.uid);
    if (cancelled) return;
    if (record) {
      setConnected(true);
      setDriveEmail(record.driveEmail ?? profileDriveEmail);
      void refreshStorageRef.current();
    } else if (!profileDriveEmail) {
      setConnected(false);
      setDriveEmail(null);
    }
  } finally {
    if (!cancelled) setDriveLoading(false);
  }
})();
```

Update `disconnect()` (lines 187-200):
Add backend disconnect call before clearing local state:
```typescript
const disconnect = useCallback(async () => {
  if (!user) return;
  // Tell backend to clear server-side tokens
  try {
    await apiClient.post(
      `${aiApi.baseUrl}/api/drive/disconnect`,
      {},
      { headers: await aiApi.authHeaders() },
    );
  } catch {
    // Non-fatal — local cleanup still proceeds
  }
  await clearDriveToken(user.uid);
  setConnected(false);
  setDriveEmail(null);
  setStorageQuota(null);
  try {
    await updateUserProfile(user.uid, { connectedDriveEmail: null });
  } catch {
    // Non-fatal.
  }
}, [user]);
```

Add imports for `apiClient` and `aiApi`:
```typescript
import { apiClient } from '@/services/api';
import { aiApi } from '@/services/aiService';
```

---

### 7. `server/routes/drive.ts`

| | |
|---|---|
| **Current** | 8 routes: `/token`, `/status`, `/storage`, `/analytics`, `/recent`, `/search`, `/activity`, `/disconnect`. No `/connect` route. `/token` returns only `accessToken`. |
| **Proposed** | Add `POST /connect` route to receive tokens from frontend and persist them. Update `/token` to also return `refreshToken` when available. Keep all existing routes unchanged. |
| **Reason** | The new `/connect` endpoint is the server-side entry point for the GIS token exchange. Updating `/token` to return the refresh token enables the frontend to cache it locally for fallback refreshes. |
| **Risk** | **Medium.** New endpoint must validate inputs, authorize the user, and handle error cases correctly. |

Specific changes:

**a) Add `POST /connect` route (after imports, before existing routes):**
```typescript
/**
 * POST /api/drive/connect
 *
 * Receives OAuth tokens from the frontend (obtained via GIS consent popup)
 * and persists them to the server-side store. The refresh token is stored
 * ONLY in the server-only collection — never exposed to the client.
 *
 * This is the primary entry point for establishing a Drive connection.
 */
router.post('/connect', async (req, res) => {
  try {
    const uid = req.user!.uid;
    const { accessToken, refreshToken, driveEmail } = req.body;

    if (!accessToken || typeof accessToken !== 'string') {
      res.status(400).json({ error: 'Access token is required.' });
      return;
    }

    const now = Date.now();
    const expiresAt = now + 55 * 60 * 1000; // 55 minutes (conservative)
    const grantedAt = now;

    await saveDriveTokenRecord(uid, {
      accessToken,
      refreshToken: refreshToken ?? null,
      expiresAt,
      grantedAt,
      driveEmail: driveEmail ?? null,
    });

    res.json({ connected: true, driveEmail: driveEmail ?? null });
  } catch (error) {
    console.error(`[drive] Connect error:`, error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Unable to save Drive connection.' });
  }
});
```

**b) Update `POST /token` route response (line 79):**
Change:
```typescript
res.json({ accessToken });
```
To:
```typescript
res.json({ accessToken, refreshToken: record.refreshToken ?? undefined });
```

**c) Update `POST /disconnect` route (lines 286-296):**
No changes needed — it already calls `deleteDriveTokenRecord(uid)` which clears both collections.

**d) Add import for `saveDriveTokenRecord`:**
Already imported on line 4-8. No change needed.

---

### 8. `server/services/driveTokenExchange.ts`

| | |
|---|---|
| **Current** | `exchangeRefreshToken()` POSTs to `oauth2.googleapis.com/token` using `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from env. Throws `TokenRevokedError` on invalid grant. |
| **Proposed** | Add a new `exchangeAuthorizationCode()` function for exchanging an OAuth authorization code for tokens. Keep `exchangeRefreshToken()` unchanged. |
| **Reason** | The new `exchangeAuthorizationCode()` enables the backend to handle OAuth authorization codes directly (for future use if the redirect flow is enhanced). It also provides a complete OAuth toolkit. For the immediate fix, `exchangeRefreshToken()` is sufficient. |
| **Risk** | **Low.** Adding a new function. Existing function unchanged. |

Specific changes — add after `exchangeRefreshToken()`:
```typescript
/**
 * Exchanges an OAuth authorization code for access + refresh tokens.
 * Used when the backend handles the OAuth callback directly.
 */
export async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Server is not configured for Drive token exchange. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
    );
  }

  let response: Response;
  try {
    response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error('[drive] auth code exchange network error:', err instanceof Error ? err.message : err);
    throw new Error('Unable to reach Google token service.');
  }

  if (!response.ok) {
    const errorBody = await response.text();
    let errorCode = '';
    try {
      const parsed = JSON.parse(errorBody) as { error?: string };
      errorCode = parsed.error ?? '';
    } catch { /* non-JSON */ }

    console.error(`[drive] auth code exchange failed (${response.status}) code=${errorCode || 'unknown'}`);

    if (/invalid_grant|expired_code/i.test(errorCode)) {
      throw new TokenRevokedError('The authorization code has expired. Please reconnect Google Drive.');
    }
    throw new Error('Unable to exchange authorization code.');
  }

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!data.access_token || !data.refresh_token) {
    throw new Error('Google token exchange did not return required tokens.');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in ?? 3600,
  };
}
```

---

### 9. `server/services/driveTokenService.ts`

| | |
|---|---|
| **Current** | `saveDriveTokenRecord()` writes non-sensitive fields to `driveTokens/{uid}` and the refresh token to `driveTokensServer/{uid}`. `getDriveTokenRecord()` merges from both collections. |
| **Proposed** | No changes. The existing dual-collection architecture is correct and well-designed. |
| **Reason** | The separation of `driveTokens` (frontend-visible, no refresh token) and `driveTokensServer` (server-only, has refresh token) is exactly what we need. |
| **Risk** | **None.** No changes. |

---

### 10. `server/services/driveService.ts`

| | |
|---|---|
| **Current** | `getUsableAccessToken()` reads token record, refreshes via `exchangeRefreshToken()` if expired. |
| **Proposed** | No changes. The existing logic correctly handles refresh when a refresh token is available. |
| **Reason** | The bug was never in the server-side refresh logic — it was that no refresh token was being saved in the first place. Once the new `/connect` endpoint saves the refresh token, this function works correctly. |
| **Risk** | **None.** No changes. |

---

### 11. `firestore.rules`

| | |
|---|---|
| **Current** | `driveTokens/{uid}` allows owner read/write. `driveTokensServer/{uid}` denies all client access. |
| **Proposed** | Change `driveTokens/{uid}` to deny all client access (read AND write). The frontend no longer reads or writes this collection directly — all operations go through the backend API. |
| **Reason** | The `driveTokens` collection currently stores access tokens that are readable by the client. After the fix, the frontend gets tokens from the backend API (`POST /api/drive/token`), not from Firestore directly. Removing client access eliminates the XSS token-exfiltration vector. |
| **Risk** | **Medium.** Must verify that no frontend code reads from `driveTokens` Firestore after the changes. The `getDriveToken()` in `firestoreService.ts` reads from this collection — this path becomes dead code but must not break anything. If it does, remove the Firestore fallback from `getStoredDriveToken()`. |

Specific change:
```
match /driveTokens/{uid} {
  // Server-only collection. All access goes through the backend API.
  allow read, write: if false;
}
```

---

### 12. `firestore.indexes.json` (NEW FILE)

| | |
|---|---|
| **Current** | File does not exist. |
| **Proposed** | Create with composite index for `uploadHistory` collection. |
| **Reason** | The `uploadHistory` collection is queried by `userId`. Without an explicit index, Firestore auto-creates it, but `firebase deploy` without this file will not manage indexes. |
| **Risk** | **None.** New file, no existing behavior affected. |

Content:
```json
{
  "indexes": [
    {
      "collectionGroup": "uploadHistory",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "uploadedAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

### 13. `.env.production`

| | |
|---|---|
| **Current** | Missing `VITE_GOOGLE_CLIENT_ID`. |
| **Proposed** | Add `VITE_GOOGLE_CLIENT_ID`. |
| **Reason** | Without it, `gisConfigured()` returns false in production, disabling the GIS token client. |
| **Risk** | **Low.** Single line addition. |

Add:
```
VITE_GOOGLE_CLIENT_ID=984526389105-78jesfj2ga9htpi8f8uuqqnchr3nj607.apps.googleusercontent.com
```

---

### 14. `.env`

| | |
|---|---|
| **Current** | `GOOGLE_CLIENT_SECRET=` is empty with a TODO comment. |
| **Proposed** | Set the actual client secret value. |
| **Reason** | Without the client secret, the backend cannot exchange refresh tokens. |
| **Risk** | **Low for code, HIGH for security.** The secret must not be committed to git. Verify `.gitignore` includes `.env`. |

Change:
```
GOOGLE_CLIENT_SECRET=<actual secret value>
```

---

### 15. `.env.example`

| | |
|---|---|
| **Current** | Documents `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` but they are marked optional. |
| **Proposed** | Mark `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as required for cross-device Drive persistence. |
| **Reason** | Developer documentation clarity. |
| **Risk** | **None.** Documentation only. |

---

### 16. `Dockerfile`

| | |
|---|---|
| **Current** | Passes `VITE_` build args but not `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` runtime env vars. |
| **Proposed** | Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as runtime environment variables (not build args — they are secrets). |
| **Reason** | Without them, the container cannot exchange refresh tokens. |
| **Risk** | **Low.** Docker env vars are standard practice. Must NOT use `ARG` (build-time) for secrets. |

Add to the runner stage, after `COPY nginx.conf`:
```dockerfile
ENV GOOGLE_CLIENT_ID=""
ENV GOOGLE_CLIENT_SECRET=""
```

These are overridden at runtime via `docker run -e` or Cloud Run env vars. The defaults are empty so the image doesn't bake in secrets.

---

### 17. `cloudbuild.yaml`

| | |
|---|---|
| **Current** | Deploys to Cloud Run with only `--allow-unauthenticated` and `--memory`. No env vars passed. |
| **Proposed** | Pass `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as Cloud Run env vars. Also pass `VITE_GOOGLE_CLIENT_ID` as a build arg. |
| **Reason** | Cloud Run containers need these env vars to function. |
| **Risk** | **Low.** Cloud Run `--set-env-vars` is standard. Secrets should ideally come from Secret Manager, but env vars are acceptable for initial fix. |

Update the `gcloud run deploy` step:
```yaml
- name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
  entrypoint: gcloud
  args:
    - "run"
    - "deploy"
    - "driveflow"
    - "--image"
    - "gcr.io/$PROJECT_ID/driveflow:$COMMIT_SHA"
    - "--region"
    - "us-central1"
    - "--platform"
    - "managed"
    - "--allow-unauthenticated"
    - "--memory"
    - "512Mi"
    - "--set-env-vars"
    - "GOOGLE_CLIENT_ID=${_GOOGLE_CLIENT_ID},GOOGLE_CLIENT_SECRET=${_GOOGLE_CLIENT_SECRET}"
```

Add to `substitutions`:
```yaml
_GOOGLE_CLIENT_ID: ""
_GOOGLE_CLIENT_SECRET: ""
```

Also add `VITE_GOOGLE_CLIENT_ID` to the Docker build-args section:
```yaml
- "--build-arg"
- "VITE_GOOGLE_CLIENT_ID=${_VITE_GOOGLE_CLIENT_ID}"
```

And to substitutions:
```yaml
_VITE_GOOGLE_CLIENT_ID: "984526389105-78jesfj2ga9htpi8f8uuqqnchr3nj607.apps.googleusercontent.com"
```

---

### 18. `server/index.ts`

| | |
|---|---|
| **Current** | Rate limiters use default IP-based `keyGenerator`. |
| **Proposed** | Add a custom `keyGenerator` that uses `req.user?.uid` for authenticated routes. Apply rate limiters after auth middleware on protected routes, or use a two-tier approach. |
| **Reason** | IP-based limiting penalizes all users behind the same proxy/IP. User-scoped limiting is fairer and more effective. |
| **Risk** | **Medium.** Rate limiter placement relative to auth middleware matters. Health check endpoint must remain unauthenticated. |

Approach — keep global IP-based limiter for unauthenticated routes, add user-scoped limiters for authenticated routes:

```typescript
const userKeyGenerator = (req: express.Request) => req.user?.uid ?? req.ip;

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
  message: { error: 'Too many chat requests. Please slow down.' },
});
```

Apply `chatLimiter` and `driveLimiter` after the auth middleware in their respective route files, or use `app.use('/api/chat', authenticateFirebaseUser, chatLimiter)`. The simplest approach: add `keyGenerator` to existing limiters and ensure auth middleware runs before rate-limited routes.

Since auth middleware is applied at the route level (in each router file), and rate limiters are applied at the app level (in `index.ts`), the `req.user` won't be set when the rate limiter runs. Solution: apply rate limiters inside the route files, after auth middleware. Or: use a lazy key generator that falls back to IP when `req.user` is not yet set.

**Simplest safe approach:** Add `keyGenerator: userKeyGenerator` to the existing limiters. When `req.user` is undefined (unauthenticated requests), it falls back to `req.ip`. This is backward-compatible and improves accuracy for authenticated requests.

---

### 19. `src/services/uploadService.ts`

| | |
|---|---|
| **Current** | `uploadFileToDrive()` receives `accessToken` as a parameter and sends it to Google Drive. On 401, clears the stored token. |
| **Proposed** | No structural changes. The token it receives will now come from `POST /api/drive/token` (via `getDriveAccessToken()`) instead of from localStorage. The 401 handler should call `clearDriveToken()` AND potentially trigger a re-connect flow. |
| **Reason** | The upload mechanism (direct browser→Google Drive) is unchanged. Only the token source changes. |
| **Risk** | **Low.** The `clearDriveToken()` call on 401 is already correct. The caller (`Upload.tsx`) should handle the error and prompt reconnection. |

Minor change: In the 401 handler (line 119-121), also consider calling the backend disconnect endpoint to clean up server-side tokens. This is optional — the server-side tokens will fail on next refresh attempt anyway.

---

### 20. `src/pages/ConnectDrive.tsx`

| | |
|---|---|
| **Current** | Calls `connect()` from `useDrive()` which calls `getDriveAccessToken()`. Shows error with "Advanced → Go to DriveFlow (unsafe)" guidance. |
| **Proposed** | No changes. The `connect()` → `getDriveAccessToken()` → GIS flow continues to work. The GIS consent popup may show the "unverified app" warning during development — the existing error handling covers this. |
| **Reason** | UI preservation requirement. The underlying flow is fixed, but the user-facing experience is the same. |
| **Risk** | **None.** No changes. |

---

### 21. `src/pages/Settings.tsx`

| | |
|---|---|
| **Current** | Calls `connect()` and `disconnect()` from `useDrive()`. |
| **Proposed** | No changes. |
| **Reason** | The underlying `connect()` and `disconnect()` callbacks are updated in `DriveContext.tsx`. The Settings page consumes them unchanged. |
| **Risk** | **None.** No changes. |

---

### 22. `src/routes/ProtectedRoute.tsx`

| | |
|---|---|
| **Current** | `ProtectedRoute` requires `connected` from `useDrive()` for email users. `driveLoading` gates the check. |
| **Proposed** | No changes. The `driveLoading` gate ensures the backend status check completes before the Drive connection requirement is evaluated. On a fresh device, `driveLoading` will be true while the backend status check runs, then `connected` will be set correctly. |
| **Reason** | The routing logic is correct. The fix is in how `DriveContext` determines `connected` (backend status check), not in the routing guards. |
| **Risk** | **None.** No changes. |

---

### 23. `tests/cross-device-token.test.ts` (NEW FILE)

| | |
|---|---|
| **Current** | Does not exist. |
| **Proposed** | Create test file covering cross-device token persistence scenarios. |
| **Reason** | The core bug is cross-device persistence. Tests must verify the fix. |
| **Risk** | **None.** New test file. |

Test cases:
1. `saveDriveTokenRecord` with refresh token → `getDriveTokenRecord` returns it
2. `saveDriveTokenRecord` without refresh token → `getDriveTokenRecord` returns null refresh token
3. `getDriveTokenPublicInfo` never exposes refresh token or access token
4. Server token exchange with valid refresh token → returns new access token
5. Server token exchange with revoked refresh token → throws `TokenRevokedError`
6. `POST /api/drive/connect` saves tokens → `GET /api/drive/status` returns connected
7. `POST /api/drive/disconnect` clears tokens → `GET /api/drive/status` returns disconnected
8. `POST /api/drive/token` with valid refresh token → returns fresh access token
9. `POST /api/drive/token` without refresh token → returns 400
10. Cross-user isolation: user A's tokens not accessible by user B

---

### 24. `tests/drive-token-refresh.test.ts`

| | |
|---|---|
| **Current** | Tests `exchangeRefreshToken()` with mocked fetch. Tests error handling, token revocation, rate limiting. |
| **Proposed** | Add test for `exchangeAuthorizationCode()` (new function). Add test for empty `GOOGLE_CLIENT_SECRET`. |
| **Reason** | New function needs test coverage. The empty secret case is a real production scenario (currently broken). |
| **Risk** | **None.** Adding tests to existing file. |

New test cases:
1. `exchangeAuthorizationCode` returns access + refresh tokens on success
2. `exchangeAuthorizationCode` throws on invalid code
3. `exchangeAuthorizationCode` throws clear error without client credentials
4. `exchangeRefreshToken` with empty `GOOGLE_CLIENT_SECRET` → throws config error

---

### 25. `tests/backend-security.test.ts`

| | |
|---|---|
| **Current** | Tests auth enforcement on protected endpoints, secret leakage prevention, identity bypass. |
| **Proposed** | Add tests for: (1) `POST /api/drive/connect` requires auth, (2) `POST /api/drive/connect` with invalid body returns 400, (3) rate limiter behavior, (4) CORS headers. |
| **Reason** | New endpoint needs security testing. Rate limiter and CORS changes need verification. |
| **Risk** | **None.** Adding tests. |

New test cases:
1. `POST /api/drive/connect` with no token → 401
2. `POST /api/drive/connect` with invalid token → 401
3. `POST /api/drive/connect` with valid token but no body → 400
4. `POST /api/drive/connect` with valid token and valid body → 200
5. Rate limiter: 101st request within 15 min → 429
6. CORS: response includes `Access-Control-Allow-Origin` header

---

## Complete Change Summary

| # | File | Type | Risk |
|---|---|---|---|
| 1 | `src/firebase/auth.ts` | Modify | Low |
| 2 | `src/context/AuthContext.tsx` | Modify | Low |
| 3 | `src/services/driveService.ts` | Modify | Medium |
| 4 | `src/services/aiService.ts` | Modify | Low |
| 5 | `src/services/firestoreService.ts` | No change | None |
| 6 | `src/context/DriveContext.tsx` | Modify | Medium |
| 7 | `server/routes/drive.ts` | Modify | Medium |
| 8 | `server/services/driveTokenExchange.ts` | Modify | Low |
| 9 | `server/services/driveTokenService.ts` | No change | None |
| 10 | `server/services/driveService.ts` | No change | None |
| 11 | `firestore.rules` | Modify | Medium |
| 12 | `firestore.indexes.json` | Create | None |
| 13 | `.env.production` | Modify | Low |
| 14 | `.env` | Modify | Low |
| 15 | `.env.example` | Modify | None |
| 16 | `Dockerfile` | Modify | Low |
| 17 | `cloudbuild.yaml` | Modify | Low |
| 18 | `server/index.ts` | Modify | Medium |
| 19 | `src/services/uploadService.ts` | No change | None |
| 20 | `src/pages/ConnectDrive.tsx` | No change | None |
| 21 | `src/pages/Settings.tsx` | No change | None |
| 22 | `src/routes/ProtectedRoute.tsx` | No change | None |
| 23 | `tests/cross-device-token.test.ts` | Create | None |
| 24 | `tests/drive-token-refresh.test.ts` | Modify | None |
| 25 | `tests/backend-security.test.ts` | Modify | None |

**Files modified:** 13
**Files created:** 2
**Files unchanged:** 9

---

## Test Plan

### Unit Tests (server-side)

| Test File | Test Case | What It Verifies |
|---|---|---|
| `cross-device-token.test.ts` | Save with refresh token → read returns it | Token persistence works |
| `cross-device-token.test.ts` | Save without refresh token → read returns null | Legacy tokens handled |
| `cross-device-token.test.ts` | Public info never exposes tokens | Security: no token leakage |
| `cross-device-token.test.ts` | Exchange with valid refresh token | Token refresh works |
| `cross-device-token.test.ts` | Exchange with revoked token → TokenRevokedError | Revocation detected |
| `cross-device-token.test.ts` | Connect endpoint saves tokens | New endpoint works |
| `cross-device-token.test.ts` | Disconnect endpoint clears tokens | Disconnect works |
| `cross-device-token.test.ts` | Token endpoint returns access token | Token serving works |
| `cross-device-token.test.ts` | Token endpoint without refresh → 400 | Missing refresh handled |
| `cross-device-token.test.ts` | Cross-user isolation | Security: no cross-user access |
| `drive-token-refresh.test.ts` | Auth code exchange success | New function works |
| `drive-token-refresh.test.ts` | Auth code exchange with empty secret | Error handling |
| `backend-security.test.ts` | /connect requires auth | Security |
| `backend-security.test.ts` | /connect with invalid body → 400 | Input validation |
| `backend-security.test.ts` | Rate limiter behavior | Rate limiting works |
| `backend-security.test.ts` | CORS headers present | CORS configuration |

### Integration Tests (end-to-end flow)

| Scenario | Steps | Expected Result |
|---|---|---|
| Fresh user, Google sign-in | 1. Sign in with Google 2. Check Drive status | Drive not connected (no auto-connect) |
| Fresh user, connect Drive | 1. Sign in 2. Click "Connect Drive" 3. GIS consent 4. Check status | Drive connected, refresh token stored server-side |
| Cross-device persistence | 1. Connect on Device A 2. Log in on Device B 3. Check status | Drive connected on Device B (no re-auth needed) |
| Token refresh | 1. Connect Drive 2. Wait for token expiry 3. Upload file | Token refreshed automatically, upload succeeds |
| Disconnect | 1. Connect Drive 2. Disconnect 3. Check status | Drive disconnected, tokens cleared |
| Revoke on Google | 1. Connect Drive 2. Revoke on Google 3. Upload | 401 → reconnection required |
| Email user flow | 1. Register 2. Verify email 3. Connect Drive | All steps complete, Drive connected |

### Regression Tests

| Area | What to Watch |
|---|---|
| Google sign-in | Sign-in still works without Drive scopes |
| Auto-connect removal | No "connected" flash on sign-in |
| localStorage fallback | Dev mode (no Firestore) still works |
| Redirect flow | `completeRedirectConnect()` still handles pending redirects |
| Upload flow | Direct browser→Drive upload still works |
| RAG/Chat | AI chat still retrieves Drive context correctly |
| Journal export | Export to Drive still works via n8n |
| Settings page | Connect/Disconnect buttons work correctly |
| Protected routes | Email users still redirected to /connect-drive |

---

## Recommended Implementation Order

### Phase 1: Backend Foundation (no frontend changes yet)
1. Set `GOOGLE_CLIENT_SECRET` in `.env`
2. Add `POST /api/drive/connect` endpoint to `server/routes/drive.ts`
3. Update `POST /api/drive/token` to return `refreshToken`
4. Add `exchangeAuthorizationCode()` to `server/services/driveTokenExchange.ts`
5. Run existing tests to verify no regressions

### Phase 2: Environment & Deployment
6. Add `VITE_GOOGLE_CLIENT_ID` to `.env.production`
7. Add runtime env vars to `Dockerfile`
8. Update `cloudbuild.yaml` with env vars
9. Update `.env.example` documentation

### Phase 3: Frontend Token Flow
10. Update `src/services/aiService.ts` (add `saveDriveTokens`, update `refreshDriveToken`)
11. Update `src/services/driveService.ts` (remove `autoConnectFromGoogleSignIn`, add backend persistence in `connectWithGis`/`getDriveAccessToken`, update `refreshFromServer`)
12. Update `src/firebase/auth.ts` (remove Drive scopes from sign-in provider)
13. Update `src/context/AuthContext.tsx` (remove auto-connect after Google sign-in)
14. Update `src/context/DriveContext.tsx` (add backend status check in init, update disconnect)

### Phase 4: Security Hardening
15. Update `firestore.rules` (deny client access to `driveTokens`)
16. Create `firestore.indexes.json`
17. Update rate limiters in `server/index.ts` (user-scoped key generator)
18. Remove debug console.log from `src/services/driveService.ts`

### Phase 5: Testing
19. Create `tests/cross-device-token.test.ts`
20. Update `tests/drive-token-refresh.test.ts`
21. Update `tests/backend-security.test.ts`
22. Run full test suite: `npm test`
23. Manual testing: sign-in → connect → cross-device → disconnect → reconnect

### Phase 6: Verification
24. Test in development (local frontend + backend)
25. Test Docker build and container startup
26. Verify Firestore rules deploy correctly
27. Verify no console errors in browser
28. Verify upload flow end-to-end

---

## Potential Regressions

| Regression | Mitigation |
|---|---|
| Google sign-in no longer auto-connects Drive | One extra click for first-time Google users. UI already has "Connect Drive" page. |
| `firestore.rules` change blocks client reads of `driveTokens` | Verify no frontend code path reads this collection after changes. The `getDriveToken()` in `firestoreService.ts` becomes dead code but won't break (try/catch handles it). |
| Backend `/connect` endpoint not reached (CORS, network) | The `saveTokensToServer()` helper has try/catch — failure is non-fatal for the current session. |
| GIS popup blocked by browser | Existing error handling in `normalizeAuthError()` covers this. Redirect fallback still works. |
| Rate limiter key change causes unexpected 429s | `keyGenerator` falls back to IP when `req.user` is undefined, so unauthenticated routes are unaffected. |
| `refreshFromServer()` returns `refreshToken` but caller doesn't store it | Must update `refreshFromServer()` in `driveService.ts` to store the refresh token in `StoredDriveToken`. |
| `completeRedirectConnect()` still doesn't persist refresh token | Acceptable: redirect flow is a fallback. The primary GIS flow handles persistence. Document this limitation. |
| Cloud Run env vars not set → backend can't refresh tokens | The backend already handles missing `GOOGLE_CLIENT_SECRET` gracefully (throws clear error). Add env var validation on startup. |
