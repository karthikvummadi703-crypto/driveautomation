# DriveFlow Technical Audit Report

**Date:** 2026-09-03
**Scope:** Full codebase technical audit
**Status:** READ-ONLY — No changes made

---

## A. Current Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite + Tailwind)                         │
│  - SPA served via Firebase Hosting / Vercel / nginx         │
│  - Auth: Firebase Auth (Google + Email/Password)            │
│  - State: React Context (AuthContext, DriveContext, etc.)   │
│  - Storage: Firestore (client SDK) + localStorage           │
│  - Uploads: Direct browser → Google Drive (multipart)       │
└──────────┬───────────────────────────────────────────────────┘
           │ Firebase ID Token (Bearer)
           ▼
┌──────────────────────────────────────────────────────────────┐
│  Backend (Express.js, Node 20+)                             │
│  - Auth: Firebase Admin SDK (verifyIdToken)                 │
│  - Storage: Firestore (Admin SDK) + in-memory cache        │
│  - AI: Gemini API via REST                                  │
│  - RAG: Query → classify → retrieve Drive context → Gemini  │
│  - Deploy: Cloud Run (Docker + nginx)                       │
└──────────────────────────────────────────────────────────────┘
           │ OAuth access_token / refresh_token
           ▼
┌──────────────────────────────────────────────────────────────┐
│  Google APIs                                                │
│  - Drive API v3 (upload, metadata, search, about)           │
│  - Drive Activity API v2                                    │
│  - OAuth2 token endpoint (refresh_token → access_token)     │
│  - Gemini API                                              │
└──────────────────────────────────────────────────────────────┘
```

### Firestore Collections

| Collection | Access | Contents |
|---|---|---|
| `users/{uid}` | Owner only | Profile, settings, `connectedDriveEmail` |
| `users/{uid}/journalEntries/*` | Owner only | Journal entries |
| `users/{uid}/conversations/*` | Owner only | Chat conversations |
| `users/{uid}/summaries/*` | Owner only | AI summaries |
| `users/{uid}/driveExports/*` | Owner only | Drive export records |
| `uploadHistory/{docId}` | Owner read/delete, owner create | Upload records |
| `settings/{uid}` | Owner only | User settings |
| `driveTokens/{uid}` | Owner read/write | Access token, expiry, driveEmail (NO refresh token) |
| `driveTokensServer/{uid}` | **DENIED to all clients** | Refresh token, access token (server-only) |

---

## B. Current Authentication Flow

### Google Sign-In Path
1. User clicks "Sign in with Google" → `signInWithPopup` with `GoogleAuthProvider`
2. Provider configured with scopes: `drive.file drive.metadata.readonly drive.activity.readonly`
3. `extractGoogleAccessToken()` extracts the OAuth access token from the credential
4. `autoConnectFromGoogleSignIn()` saves this token as a Drive token:
   - Writes to `localStorage` (key: `driveflow.drive.token.v1`)
   - Writes to Firestore `driveTokens/{uid}` (access token + expiry + email)
   - `refreshToken` is hardcoded to `null`
5. `persistUserProfile()` saves `connectedDriveEmail` to user profile

### Email/Password Sign-In Path
1. User signs in with email/password → `signInWithEmailAndPassword`
2. Must verify email before accessing protected routes
3. Must connect Google Drive separately via `ConnectDrive` page
4. Drive connect uses GIS (popup) or Firebase redirect

---

## C. Current Google Drive OAuth Flow

### Three pathways for obtaining Drive access tokens:

**Path 1: Google Sign-In Auto-Connect** (line 109-128, `src/services/driveService.ts`)
- Triggered automatically after `signInWithGoogle` in `AuthContext`
- Uses the access token from Firebase's `signInWithPopup`
- Saves with `refreshToken: null`
- **No refresh token is ever obtained or stored**

**Path 2: GIS Token Client** (lines 226-264, `src/services/driveService.ts`)
- Loads `https://accounts.google.com/gsi/client` dynamically
- Uses `VITE_GOOGLE_CLIENT_ID` as the client ID
- Calls `requestAccessToken({ prompt: 'consent' })`
- Returns `access_token` and optionally `refresh_token` (first consent only)
- This is the ONLY path that can provide a refresh token
- Fallback used when `VITE_GOOGLE_CLIENT_ID` is configured

**Path 3: Firebase Redirect** (lines 394-411, `src/services/driveService.ts`)
- Uses `reauthenticateWithRedirect` or `linkWithRedirect`
- Provider configured with `prompt: 'consent', access_type: 'offline'`
- Result resolved on next page load by `completeRedirectConnect()`
- **`completeRedirectConnect()` does NOT save any refresh token** (line 430-451)
- Fallback used when GIS is not configured

---

## D. Current Token Lifecycle

### Access Token Lifecycle
1. Obtained from one of three pathways above
2. Cached in `localStorage` with 55-minute TTL
3. Cached in Firestore `driveTokens/{uid}` with `expiresAt`
4. On expiry, frontend calls `POST /api/drive/token`
5. Backend checks if refresh token exists → exchanges for new access token
6. Without refresh token: returns 400 "cannot be refreshed automatically"

### Refresh Token Lifecycle
1. **Only obtainable** via Path 2 (GIS) on first consent
2. **Never obtainable** via Path 1 (Google sign-in) or Path 3 (redirect resolution)
3. Stored in Firestore `driveTokensServer/{uid}` (server-only, denied by rules)
4. Stored in-memory as fallback for development
5. Used by backend `POST /api/drive/token` to get new access tokens
6. Never exposed to the frontend

### Server-Side Token Exchange
1. `POST /api/drive/token` → `getDriveTokenRecord(uid)` → merges from both collections
2. If access token valid (>5min margin): return as-is
3. If expired + has refresh token: `exchangeRefreshToken()` → POST to `oauth2.googleapis.com/token`
4. Saves new access token via `saveDriveTokenRecord()`
5. If expired + no refresh token: 400 error "cannot be refreshed automatically"

---

## E. Current Cross-Device Behavior

### Scenario: User connects Drive on Device A, then logs in on Device B

**If Path 2 (GIS) was used on Device A:**
- ✅ Refresh token stored in `driveTokensServer`
- ✅ Device B's `getStoredDriveToken()` → localStorage miss → Firestore `driveTokens` miss → `refreshFromServer()` → server has refresh token → returns fresh access token
- ✅ Works correctly

**If Path 1 (Google sign-in) was used on Device A:**
- ❌ No refresh token stored
- ❌ Access token expires after ~55 minutes
- ❌ Device B has no localStorage, no valid Firestore access token, no refresh token
- ❌ `refreshFromServer()` returns 400 "cannot be refreshed automatically"
- ❌ User must reconnect Drive on Device B
- ❌ **Cross-device persistence is broken**

**If Path 3 (Firebase redirect) was used on Device A:**
- ❌ `completeRedirectConnect()` does not save refresh token to server store
- ❌ Same failure as Path 1
- ❌ **Cross-device persistence is broken**

---

## F. Problems Discovered

### F-1. Google Sign-In Does Not Obtain Refresh Token
**Severity: CRITICAL**

`autoConnectFromGoogleSignIn()` (line 109-128, `src/services/driveService.ts`) hardcodes `refreshToken: null`:
```typescript
const record: DriveTokenRecord = {
  uid,
  accessToken,
  refreshToken: null,  // <-- ALWAYS null
  driveEmail,
  expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
  grantedAt: Date.now(),
};
```

The `GoogleAuthProvider` in `src/firebase/auth.ts` does not request `access_type: 'offline'`:
```typescript
provider.setCustomParameters({ prompt: 'select_account' });
// Missing: access_type: 'offline', prompt: 'consent'
```

Firebase Auth does not expose refresh tokens from Google sign-in results. The only access token available is the short-lived one (~1 hour). Without a refresh token, cross-device persistence is impossible for any user who signs in with Google.

**Impact:** Every Google sign-in user loses their Drive connection within ~1 hour and cannot recover it from another device.

---

### F-2. Redirect Flow Does Not Persist Refresh Token
**Severity: HIGH**

`completeRedirectConnect()` (line 418-454, `src/services/driveService.ts`) receives the redirect result but does not extract or persist the refresh token:
```typescript
const credential = GoogleAuthProvider.credentialFromResult(result);
// ...
cacheDriveAccessToken(user.uid, credential.accessToken, driveEmail);
const record: DriveTokenRecord = {
  uid: user.uid,
  accessToken: credential.accessToken,
  driveEmail,
  expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
  grantedAt: Date.now(),
  // refreshToken is missing from the object entirely
};
```

Even though the provider requests `access_type: 'offline'`, the refresh token from the redirect result is not saved to the server-only store.

---

### F-3. .env.production Missing VITE_GOOGLE_CLIENT_ID
**Severity: HIGH**

`.env.production` does not include `VITE_GOOGLE_CLIENT_ID`, while `.env.development` does:
```env
# .env.development (has it)
VITE_GOOGLE_CLIENT_ID=984526389105-78jesfj2ga9htpi8f8uuqqnchr3nj607.apps.googleusercontent.com

# .env.production (missing it)
# VITE_GOOGLE_CLIENT_ID is absent
```

This means `gisConfigured()` returns `false` in production, forcing all users through the Firebase redirect path (Path 3), which also fails to persist refresh tokens (F-2).

---

### F-4. Dockerfile Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
**Severity: HIGH**

The `Dockerfile` passes `VITE_` vars as build args but does not pass `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` as runtime env vars:
```dockerfile
ARG VITE_FIREBASE_API_KEY
# ... other VITE_ args ...
# MISSING:
# GOOGLE_CLIENT_ID
# GOOGLE_CLIENT_SECRET
```

The Cloud Run deployment (`cloudbuild.yaml`) also does not pass these variables. Without them, the backend cannot exchange refresh tokens.

---

### F-5. .env Has Empty GOOGLE_CLIENT_SECRET
**Severity: HIGH**

```env
# .env
GOOGLE_CLIENT_ID=984526389105-78jesfj2ga9htpi8f8uuqqnchr3nj607.apps.googleusercontent.com
# TODO: set the full secret (ends in LwDP) here for cross-device persistence
GOOGLE_CLIENT_SECRET=
```

Even if the refresh token exchange code works correctly, it cannot function without the client secret. The TODO comment indicates this is a known incomplete setup.

---

### F-6. Access Token Stored in Frontend-Readable Firestore
**Severity: MEDIUM**

The `driveTokens/{uid}` collection stores `accessToken` (a short-lived credential). While the refresh token is properly isolated in `driveTokensServer`, the access token is readable by the client:
```
match /driveTokens/{uid} {
  allow read, write: if owner(uid);
}
```

Any XSS vulnerability in the frontend could exfiltrate active Drive access tokens. The access token grants access to the user's Google Drive until it expires.

---

### F-7. Access Token Stored in localStorage (XSS Risk)
**Severity: MEDIUM**

`cacheDriveAccessToken()` stores the access token in `localStorage`:
```typescript
localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(stored));
```

`localStorage` is accessible to any JavaScript running on the same origin. A successful XSS attack could read and exfiltrate the token. The token grants Google Drive access until expiry.

---

### F-8. Rate Limiter Uses IP-Based Tracking
**Severity: MEDIUM**

```typescript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  // default keyGenerator uses req.ip
});
```

Behind a reverse proxy (nginx, Cloud Run, load balancer), all users share the same IP. One abusive user exhausts the limit for everyone. The limiter should use a user-scoped key (Firebase UID from the verified token).

---

### F-9. Hardcoded Project ID in DriveService Enable URL
**Severity: LOW**

```typescript
const DRIVE_API_ENABLE_URL =
  'https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=984526389105';
```

This embeds the Firebase project number in the source code. While not a secret, it should be configurable for portability.

---

### F-10. Debug Console.log in Production Code
**Severity: LOW**

```typescript
// src/services/driveService.ts:238
console.log('[drive] origin=', window.location.origin, 'clientId=', GOOGLE_CLIENT_ID.slice(0, 7), 'scope=', GOOGLE_DRIVE_SCOPE);
```

Debug logging exposes partial client ID and origin to the browser console. Should be removed or guarded behind `NODE_ENV`.

---

### F-11. No `firestore.indexes.json`
**Severity: MEDIUM**

No composite indexes are defined. The `uploadHistory` collection is queried with `where('userId', '==', uid)` — Firestore will auto-create this index, but the absence of the file means `firebase deploy` won't create any custom indexes. If more complex queries are added, they will fail silently.

---

### F-12. No Firebase Storage Rules File
**Severity: LOW**

There is no `storage.rules` file and Firebase Storage is not actively used. If Storage is ever enabled, it would default to no rules (all access denied or all access open depending on the environment).

---

### F-13. No CI/CD Pipeline
**Severity: MEDIUM**

No `.github/workflows/`, no automated testing on push/PR, no lint step in CI. Code quality relies entirely on manual verification. The `cloudbuild.yaml` only builds and deploys — no test step.

---

### F-14. Frontend Drive Status May Show Stale "Connected" State
**Severity: LOW**

In `DriveContext.tsx` (line 66-70):
```typescript
const profileDriveEmail = profile?.connectedDriveEmail ?? null;
if (profileDriveEmail) {
  setConnected(true);
  setDriveEmail(profileDriveEmail);
}
```

If the profile says `connectedDriveEmail` is set but the actual tokens are expired/revoked, the UI briefly shows "Connected" before the async token check completes and potentially flips to disconnected.

---

### F-15. Unclear Scope Documentation
**Severity: LOW**

The `ConnectDrive` UI says:
> "We only request access to manage files created by this app. We can't access your existing files."

But the actual scopes include `drive.metadata.readonly` and `drive.activity.readonly`, which allow reading metadata and activity for ALL files in the user's Drive, not just those created by the app. This is a misleading claim.

---

### F-16. No `package.json` Test Script Verification
**Severity: LOW**

The test command is `tsx --test tests/*.test.ts` but there's no pre-test step to compile TypeScript. Tests import from `../server/services/*.js` which requires the server TypeScript to be compiled first, or relies on `tsx` to handle it.

---

### F-17. In-Memory Token Fallback in Production
**Severity: LOW**

`driveTokenService.ts` maintains in-memory Maps:
```typescript
const inMemoryTokens = new Map<string, DriveTokenDoc>();
const inMemoryServerTokens = new Map<string, string>();
```

These are used as fallbacks if Firestore is unavailable. In a multi-replica Cloud Run deployment, each instance has its own Map. A token saved in one instance won't be visible to another. This is documented as "dev mode only" but the code runs in all environments.

---

## G. Severity Summary

| ID | Problem | Severity |
|---|---|---|
| F-1 | Google sign-in does not obtain refresh token | **CRITICAL** |
| F-2 | Redirect flow does not persist refresh token | **HIGH** |
| F-3 | .env.production missing VITE_GOOGLE_CLIENT_ID | **HIGH** |
| F-4 | Dockerfile missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | **HIGH** |
| F-5 | .env has empty GOOGLE_CLIENT_SECRET | **HIGH** |
| F-6 | Access token in frontend-readable Firestore | **MEDIUM** |
| F-7 | Access token in localStorage | **MEDIUM** |
| F-8 | IP-based rate limiting | **MEDIUM** |
| F-9 | Hardcoded project ID in URL | LOW |
| F-10 | Debug console.log in production | LOW |
| F-11 | Missing firestore.indexes.json | **MEDIUM** |
| F-12 | Missing storage.rules file | LOW |
| F-13 | No CI/CD pipeline | **MEDIUM** |
| F-14 | Stale "connected" UI state | LOW |
| F-15 | Misleading scope documentation | LOW |
| F-16 | Test script may need compilation step | LOW |
| F-17 | In-memory token fallback in multi-replica | LOW |

---

## H. Recommended Solutions

### H-1. Fix Google Sign-In to Persist Refresh Token (CRITICAL)

**Problem:** Firebase Auth does not expose Google OAuth refresh tokens. The access token from `signInWithPopup` is short-lived and has no refresh capability.

**Solution:** Do NOT use the Google sign-in access token as a Drive token. Instead:
1. After Google sign-in, use the GIS token client to do a silent Drive OAuth consent in the background
2. OR: Skip auto-connect entirely and redirect to the Connect Drive page after Google sign-in
3. OR: Use the Firebase Auth `getRedirectResult` approach with `access_type: 'offline'` and properly persist the refresh token

**Recommended approach:** After `signInWithGoogle` succeeds, immediately trigger `connectWithGis()` (Path 2) to obtain a proper OAuth token with refresh capability. Store the refresh token in `driveTokensServer`.

### H-2. Fix Redirect Flow to Persist Refresh Token (HIGH)

**Problem:** `completeRedirectConnect()` ignores the refresh token from the redirect result.

**Solution:**
1. Extract the refresh token from `GoogleAuthProvider.credentialFromResult(result)` — it may be in `credential.refreshToken` or in the raw OAuth response
2. If available, save it to `driveTokensServer` via the backend
3. Note: Firebase's redirect flow may not return refresh tokens in all cases — verify with testing

### H-3. Add VITE_GOOGLE_CLIENT_ID to .env.production (HIGH)

**Solution:** Add the same `VITE_GOOGLE_CLIENT_ID` value to `.env.production`:
```
VITE_GOOGLE_CLIENT_ID=984526389105-78jesfj2ga9htpi8f8uuqqnchr3nj607.apps.googleusercontent.com
```

### H-4. Add GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET to Docker/Cloud Run (HIGH)

**Solution:**
1. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as Docker runtime env vars (not build args — they're secret)
2. Pass them as Cloud Run env vars in `cloudbuild.yaml` or set them via `gcloud run deploy --set-env-vars`
3. Consider using Google Cloud Secret Manager for the client secret (already used for Gemini API key)

### H-5. Set GOOGLE_CLIENT_SECRET in .env (HIGH)

**Solution:** Complete the TODO in `.env`:
```
GOOGLE_CLIENT_SECRET=<the actual secret>
```

### H-6. Minimize Access Token Exposure (MEDIUM)

**Options:**
- Remove `accessToken` from the `driveTokens` Firestore collection; store only metadata (email, expiry, grantedAt)
- The access token is only needed in localStorage for direct browser→Drive uploads
- For server-side operations, always use the server refresh endpoint

### H-7. Switch to User-Scoped Rate Limiting (MEDIUM)

**Solution:** Add a custom `keyGenerator` that uses the Firebase UID:
```typescript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.user?.uid ?? req.ip,
});
```

Note: This requires applying the rate limiter AFTER the auth middleware on protected routes, or using a two-tier approach.

### H-8. Add firestore.indexes.json (MEDIUM)

**Solution:** Create `firestore.indexes.json` with at minimum:
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
  ]
}
```

---

## I. Files That Would Need Modification

### Critical/High Priority Fixes

| File | Change |
|---|---|
| `src/firebase/auth.ts` | Add `access_type: 'offline'` to Google sign-in provider (if Firebase supports it), or change auto-connect flow |
| `src/context/AuthContext.tsx` | After Google sign-in, trigger proper Drive OAuth (GIS) instead of using sign-in token |
| `src/services/driveService.ts` | `autoConnectFromGoogleSignIn()`: remove or redirect to proper OAuth flow; `completeRedirectConnect()`: extract and persist refresh token |
| `src/context/DriveContext.tsx` | Update `connect()` to always persist refresh token to server |
| `.env.production` | Add `VITE_GOOGLE_CLIENT_ID` |
| `.env` | Set `GOOGLE_CLIENT_SECRET` |
| `Dockerfile` | Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as runtime env vars |
| `cloudbuild.yaml` | Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as Cloud Run env vars |
| `server/services/driveTokenExchange.ts` | Already correct — no changes needed |

### Medium Priority Fixes

| File | Change |
|---|---|
| `server/index.ts` | Add user-scoped rate limiting |
| `firestore.rules` | Consider removing `accessToken` from `driveTokens` collection |
| `firestore.indexes.json` | Create with uploadHistory composite index |
| `src/config/constants.ts` | Make DRIVE_API_ENABLE_URL configurable |
| `src/services/driveService.ts` | Remove debug console.log (line 238) |
| `src/services/driveService.ts` | Fix scope description to be accurate |
| `package.json` | Add `lint`, `typecheck` scripts if missing |

### Test Updates

| File | Change |
|---|---|
| `tests/` | Add cross-device token persistence tests |
| `tests/` | Add GIS flow integration tests |
| `tests/` | Add rate limiter behavior tests |
| `tests/` | Add CORS configuration tests |

---

## J. Tests That Should Be Created or Updated

### New Tests Needed

1. **Cross-device token persistence test** — Verify that a refresh token saved on "Device A" can be used to obtain a new access token from "Device B"
2. **GIS token client flow test** — Mock the GIS script and verify refresh token extraction
3. **Redirect flow completion test** — Verify `completeRedirectConnect()` persists refresh token
4. **Rate limiter user-scoped test** — Verify rate limits are per-user, not per-IP
5. **Token exchange with missing credentials test** — Verify graceful error when GOOGLE_CLIENT_SECRET is empty
6. **Frontend DriveContext initialization test** — Verify correct state transitions on mount
7. **ProtectedRoute guard test** — Verify redirect behavior for unverified/unconnected users
8. **CORS configuration test** — Verify only configured origins are allowed
9. **E2E Google sign-in → Drive connect → Upload flow** — Full integration test

### Existing Tests to Update

1. `tests/drive-token-refresh.test.ts` — Add test for missing GOOGLE_CLIENT_SECRET (currently tests empty string, should test undefined)
2. `tests/backend-security.test.ts` — Add rate limiter behavior tests
3. `tests/drive-activity.test.ts` — Expand with token lifecycle tests

---

## K. Potential Regressions to Watch For

1. **Google sign-in auto-connect removal** — If auto-connect is replaced with a GIS flow, users will see a brief "not connected" state between sign-in and Drive OAuth consent
2. **Rate limiter change to user-scoped** — Unauthenticated routes (health check) will use IP-based limiting; protected routes need the auth middleware to run first
3. **Access token removal from Firestore** — If `accessToken` is removed from `driveTokens`, any code reading it from Firestore (including the frontend `getDriveToken()`) will break
4. **GIS script loading** — The GIS script (`accounts.google.com/gsi/client`) must be loaded after the user is authenticated; loading it before may cause issues
5. **Firebase redirect flow** — Changing the redirect flow to persist refresh tokens may affect the existing `completeRedirectConnect()` timing; ensure it runs on mount before other Drive state initialization
6. **Token TTL mismatch** — The frontend 55-minute TTL and the backend 5-minute refresh margin must stay in sync; changing one without the other may cause premature refreshes or stale tokens

---

## Recommended Implementation Order

### Phase 1: Core Cross-Device Fix (CRITICAL + HIGH)
1. Set `GOOGLE_CLIENT_SECRET` in `.env` (**F-5**)
2. Add `VITE_GOOGLE_CLIENT_ID` to `.env.production` (**F-3**)
3. Add `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` to Dockerfile and cloudbuild.yaml (**F-4**)
4. Fix `autoConnectFromGoogleSignIn()` to NOT use the sign-in token; instead trigger a proper GIS OAuth flow (**F-1**)
5. Fix `completeRedirectConnect()` to extract and persist the refresh token (**F-2**)

### Phase 2: Security Hardening (MEDIUM)
6. Switch rate limiter to user-scoped (**F-8**)
7. Consider minimizing access token in Firestore (**F-6**)
8. Add `firestore.indexes.json` (**F-11**)

### Phase 3: Quality & Correctness (LOW)
9. Remove debug console.log (**F-10**)
10. Fix scope description in ConnectDrive UI (**F-15**)
11. Make DRIVE_API_ENABLE_URL configurable (**F-9**)
12. Add CI/CD pipeline with tests (**F-13**)
13. Add new test suites (**J**)
14. Fix stale connected state (**F-14**)
