# DriveFlow 🚀

**Upload files from your device straight into your own Google Drive** (per-user, via the user's own Google OAuth token — no shared pool).

A premium, production-ready SaaS frontend built with React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, React Router, Firebase Authentication, Cloud Firestore, Axios, React Hook Form, and Zod — deployed to **Google Cloud Run**.
---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Folder structure](#folder-structure)
4. [How each module connects](#how-each-module-connects)
5. [Environment variables](#environment-variables)
6. [How to run locally](#how-to-run-locally)
7. [How the frontend talks to Firebase](#how-the-frontend-talks-to-firebase)
8. [How uploads go to each user's own Google Drive](#how-uploads-go-to-each-users-own-google-drive)
9. [How upload history is stored in Firestore](#how-upload-history-is-stored-in-firestore)
10. [Firestore security rules](#firestore-security-rules)
11. [How to deploy to Google Cloud Run](#how-to-deploy-to-google-cloud-run)
12. [Scripts](#scripts)
13. [License](#license)

---

## Features

- **Landing page** — premium SaaS design, hero, animated gradient blobs, glassmorphism, gradient cards, bento grid, features, pricing, testimonials, FAQ, CTA, footer.
- **Animations** — Framer Motion page transitions, fade/slide/scale reveals, floating cards, animated navbar, scroll animations, mouse-parallax background blobs, 3D hover effects, animated count-up statistics.
- **Authentication** (Firebase) — Google sign-in, email/password sign-in, registration, forgot password, logout.
- **Own Drive uploads** — every upload goes to the **signed-in user's own Google Drive** via their OAuth token (`drive.file` scope). Google accounts upload directly; email accounts are told (honestly) that they need a Google account, so no upload ever silently lands in someone else's Drive.
- **Dashboard** — user profile, upload button, upload statistics, storage-used meter, recent uploads, upload history, search, filters, settings.
- **Upload page** — drag & drop, browse files, live progress bar (via `onUploadProgress`), success animation with the user's own Drive link, error dialog with retry.
- **History** — searchable, filterable, sortable, deletable list of every upload.
- **Settings** — edit profile, connect/disconnect Google Drive, light/dark theme, sign out.
- **Quality** — responsive, accessible (ARIA, focus rings, reduced-motion support), dark mode by default, clean architecture, typed end to end, loading/error states everywhere.

---

## Tech stack

| Area              | Tech                                                             |
| ----------------- | ---------------------------------------------------------------- |
| UI                | React 19, TypeScript, Vite 6, Tailwind CSS 3, Framer Motion 12   |
| Routing           | React Router 7                                                    |
| Auth & data       | Firebase (Authentication + Cloud Firestore)                       |
| HTTP              | Axios                                                             |
| Forms             | React Hook Form + Zod                                             |
| Deployment        | Docker + nginx static image → Google Cloud Run (or Firebase Hosting) |

---

## Folder structure

```
driveautomation/
├── .env.example                 # Documented env template
    ├── .env.development             # Dev defaults (Firebase)
├── .env.production              # Prod build-time env
├── index.html                   # Vite entry HTML (fonts, meta, root)
├── package.json
├── tsconfig.json / tsconfig.node.json
├── vite.config.ts               # Alias @/ → src, manual chunks
├── tailwind.config.js           # Palette + keyframes
├── postcss.config.js
├── Dockerfile                   # Multi-stage build → nginx:alpine (Cloud Run)
├── nginx.conf                   # SPA serve on :8080
├── cloudbuild.yaml              # Cloud Build CI pipeline
├── service.yaml                 # Cloud Run service spec
├── public/
│   ├── favicon.svg
│   └── robots.txt
└── src/
    ├── main.tsx                 # React root + providers
    ├── App.tsx                  # ThemeProvider → ToastProvider → AuthProvider → Router
    ├── vite-env.d.ts            # Vite env typings
    │
    ├── assets/svg/              # Static SVGs (illustration)
    ├── animations/
    │   ├── variants.ts          # Shared motion variants (fade, slide, stagger, float)
    │   └── presets.tsx          # Page transitions + <AnimatedPage>
    ├── components/
    │   ├── ui/                  # Button, Input, Card, Badge, Modal, ProgressBar,
    │   │                        #   Spinner, Skeleton, Logo, Icon set
    │   ├── layout/              # Background (parallax blobs), Navbar, Footer
    │   ├── landing/             # Hero, Features, BentoGrid, HowItWorks, Statistics,
    │   │                        #   Testimonials, Pricing, FAQ, CTA, ScrollReveal
    │   ├── dashboard/           # ProfileCard, StatCard, StorageUsage, UploadList,
    │   │                        #   SearchBar, FilterBar, DriveGate, DriveStatus, UploadSuccess
    │   └── auth/                # AuthShell, GoogleButton
    ├── context/
    │   ├── AuthContext.tsx      # User, profile, auth actions
    │   ├── DriveContext.tsx     # Google Drive connection + token
    │   ├── ThemeContext.tsx     # dark/light + localStorage
    │   └── ToastContext.tsx     # Toast notifications
    ├── firebase/
    │   ├── config.ts            # firebaseConfig from env (with safe defaults)
    │   ├── app.ts               # initializeApp → app, auth, db
    │   ├── auth.ts              # authService (sign-in, register, reset, sign-out…)
    │   └── firestore.ts         # Typed collection references
    ├── hooks/
    │   ├── useAuth.ts           # → useAuthContext
    │   ├── useTheme.ts          # → useThemeContext
    │   ├── useToast.ts          # → useToastContext
    │   ├── useMousePosition.ts  # Parallax motion values
    │   ├── useUploadHistory.ts  # Query + refresh + remove records
    │   └── useStorageStats.ts   # Stats + storage percentage
    ├── layouts/
    │   ├── PublicLayout.tsx     # Navbar + Background + Outlet + Footer
    │   ├── AuthLayout.tsx       # Centered auth shell
    │   └── DashboardLayout.tsx  # Sidebar + topbar + Outlet
    ├── pages/
    │   ├── LandingPage.tsx
    │   ├── Login.tsx / Register.tsx / ForgotPassword.tsx
    │   ├── Dashboard.tsx
    │   ├── Upload.tsx
    │   ├── History.tsx
    │   ├── Settings.tsx
    │   └── NotFound.tsx
    ├── routes/
    │   ├── index.tsx            # createBrowserRouter (public/auth/protected groups)
    │   └── ProtectedRoute.tsx   # ProtectedRoute + PublicOnlyRoute
    ├── services/
    │   ├── api.ts               # Axios instance + getErrorMessage
    │    ├── uploadService.ts     # multipart upload → Google Drive API (user's own Drive)
    │   └── firestoreService.ts  # users / uploadHistory / settings
    ├── styles/index.css         # Tailwind layers + utilities
    ├── types/                   # auth.ts, upload.ts, index.ts
    └── utils/
        ├── cn.ts                # className helper
        ├── format.ts            # bytes, dates, time-ago, file helpers
        └── validators.ts        # Zod schemas for all auth forms
```

---

## How each module connects

```
Browser
  │
  ├─ main.tsx ── App.tsx (ThemeProvider → ToastProvider → AuthProvider)
  │                  └─ RouterProvider(router from routes/index.tsx)
  │
  ├─ routes/index.tsx
  │     ├─ PublicLayout  → LandingPage
  │     ├─ AuthLayout    → Login / Register / ForgotPassword   (PublicOnlyRoute)
  │     └─ ProtectedRoute → DashboardLayout → Dashboard / Upload / History / Settings
  │
  ├─ pages  (thin: compose sections/components + wire hooks)
  │    └─ Dashboard.tsx, Upload.tsx, History.tsx, Settings.tsx
  │
  ├─ components
  │    ├─ layout        → chrome (Navbar, Footer, Background)
  │    ├─ landing       → marketing sections
  │    ├─ dashboard     → feature UI (UploadList, StorageUsage, DriveStatus, DriveGate…)
  │    ├─ auth          → auth UI shell
  │    └─ ui            → design system primitives (Button, Input, Modal…)
  │
  ├─ context / hooks    → global state (auth, theme, toasts) + data hooks
  │       │
  │       ▼
  ├─ services  (business layer)
  │    ├─ uploadService.ts    → Axios → Google Drive API (user's own Drive)
  │    └─ firestoreService.ts → Firebase SDK → Cloud Firestore
  │
  └─ firebase/           → initialized app, auth, db + typed collection refs
```

Flow: **pages → hooks/context → services → (firebase | axios)**. Components never call Firebase or Axios directly; the service layer owns all I/O and error normalization, so the UI stays pure.

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```dotenv
# Firebase
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=n8nsampleproject-ff2c5.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=n8nsampleproject-ff2c5
VITE_FIREBASE_STORAGE_BUCKET=n8nsampleproject-ff2c5.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=984526389105
VITE_FIREBASE_APP_ID=1:984526389105:web:ceb065d624b8f17ab780d0
VITE_FIREBASE_MEASUREMENT_ID=G-LTEHW0ZLRS
```

`src/firebase/config.ts` falls back to safe defaults, so the app boots even with empty envs — replace `YOUR_API_KEY` with your real Firebase Web API key to enable authentication.

> **Uploads need no server env.** Files are pushed from the browser to the **Google Drive API** using the signed-in user's OAuth token, so there are no webhook URLs or shared secrets.

> **Upload limit:** the app allows files up to **16 MB** (`MAX_FILE_SIZE_BYTES`). Larger files are rejected before upload.

> Vite envs are **compile-time**. For Cloud Run, pass them as build args (see `Dockerfile` / `cloudbuild.yaml`).

---

## How to run locally

```bash
npm install
cp .env.example .env.local   # add your Firebase API key
npm run dev                  # http://localhost:3000
```

**Important**: Before running the app, follow the [Google Console Setup Guide](./GOOGLE_CONSOLE_SETUP.md) to configure OAuth and avoid verification issues.

**Important**: Before running the app, follow the [Google Console Setup Guide](./GOOGLE_CONSOLE_SETUP.md) to configure OAuth and avoid verification issues.

Production preview:

```bash
npm run build
npm run preview              # http://localhost:8080
```

Quality gates:

```bash
npm run typecheck            # tsc --noEmit
npm run build                # typecheck + vite build
```

---

## How the frontend talks to Firebase

Everything goes through the **modular Firebase SDK (v11)** initialized once in `src/firebase/app.ts`:

```ts
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

- **Authentication** — `src/firebase/auth.ts` wraps the Firebase Auth API into an `authService` (Google popup, email/password, password reset, profile updates, `onAuthStateChanged`). The Google provider requests the **`drive.file`** scope so each user gets a Drive OAuth token.
- **Session state** — `AuthContext` subscribes to `onAuthStateChanged`. On each sign-in it reads the user’s profile from the `users` collection and creates a default profile if it doesn’t exist yet.
- **Drive connection** — `DriveContext` (`src/context/DriveContext.tsx`) holds the signed-in user's Drive authorization. The access token is stored **per user in Firestore** (`driveTokens` collection) and cached in `localStorage`, so the connection follows the account across devices. Near expiry it is refreshed via a Google re-auth popup (`connect` / `disconnect` / `getAccessToken`).
- **Data** — `src/services/firestoreService.ts` exposes typed functions (`getUserProfile`, `addUploadRecord`, `getUploadRecords`, …) used by the hooks.
- **Security** — because Firestore rules are the real gatekeeper, the frontend uses the Firebase **client SDK**; users can only ever read/write their own documents (see rules below).

---

## How uploads go to each user's own Google Drive

There is no shared Drive and no backend webhook: every file is pushed straight from the browser to the **Google Drive API** using the *uploader's own* OAuth token:

1. `Upload.tsx` validates the file (size/type), then asks `DriveContext.getAccessToken()` for a fresh `drive.file` token (re-auth popup if the cached one expired).
2. `src/services/uploadService.ts` builds a `multipart/related` body (JSON metadata + file bytes) and POSTs it to `https://www.googleapis.com/upload/drive/v3/files` with `Authorization: Bearer <token>` and live progress:

```ts
await driveClient.post(GOOGLE_DRIVE_UPLOAD_ENDPOINT, body, {
  params: { uploadType: 'multipart', fields: 'id,name,mimeType,webViewLink,createdTime' },
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
  onUploadProgress: (e) => /* progress % */,
});
```

3. Google returns the new file **in the uploader's own Drive** (`webViewLink`), so success is only reported for a file that really exists in a Drive owned by that user.
4. On success the UI shows the animated success modal with the Drive link, and on failure it shows an error dialog with **Retry** — including an explicit "your Drive session expired, reconnect" message on `401`.

> **Honest failure for non-Google accounts:** email/password users have no personal Drive, so they are *blocked with a clear message* (DriveGate / Settings) instead of receiving a fake success.

> **Google OAuth setup (one-time):** add the scope `https://www.googleapis.com/auth/drive.file` to the Firebase project's OAuth consent screen (Firebase Console → Authentication → Sign-in method → Google, or GCP Console → OAuth consent screen). Without it, the Google sign-in popup won't grant Drive access.

> **Enable the Google Drive API (one-time, required):** this app calls the Drive REST API directly from the browser. Open
>
> ```
> https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=984526389105
> ```
>
> and click **Enable**. If it's disabled you will see the error *"Google Drive API has not been used in project 984526389105 before or it is disabled"* on the first upload. After enabling, wait a few minutes for the change to propagate, then reconnect Drive and upload again. The app detects this specific error and shows this link automatically.

> **Cross-device connection:** the Drive grant is saved to the user's profile (Firestore `driveTokens` collection), so after connecting once it works from any device where the user signs in. Google's OAuth access tokens expire after ~1 hour; when that happens the app quietly re-opens Google's permission page for a one-click refresh instead of asking for full permission again.

---

## How upload history is stored in Firestore

After a successful Drive API response, `Upload.tsx` builds an `UploadRecord` and calls `addUploadRecord`, which writes a document to the **`uploadHistory`** collection:

```ts
{
  userId:     "uid-of-the-user",
  email:      "user@example.com",
  fileName:   "product-launch.mp4",
  fileSize:   50331648,
  fileType:   "mp4",
  driveLink:  "https://drive.google.com/file/d/…",
  status:     "success",            // | "failed"
  uploadedAt: "2026-08-02T12:00:00.000Z"
}
```

- `getUploadRecords(uid, query)` queries `where('userId','==',uid)` ordered by `uploadedAt desc`, then applies the optional search/filter/sort in memory (client-side for a snappy UX).
- The **Dashboard** stats and the storage meter are computed from the same collection by `useStorageStats`.
- The **History** page lists, searches, filters, and deletes records via `useUploadHistory`.
- Each document ID is the Firestore auto-ID; the in-memory record uses it as `id`.

### Collections used

| Collection      | Purpose                                                        |
| --------------- | -------------------------------------------------------------- |
| `users`         | One doc per user — profile, provider                          |
| `uploadHistory` | One doc per upload — metadata + Drive link                     |
| `settings`      | User preferences (theme, notifications)                        |
| `driveTokens`   | One doc per user — Google Drive OAuth access token (account-wide connection) |

---

## Firestore security rules

Deploy these from the Firebase console (Rules tab) so users can only touch their own data:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function owner(uid) { return signedIn() && request.auth.uid == uid; }

    match /users/{uid} {
      allow read, write: if owner(uid);
    }
    match /uploadHistory/{docId} {
      allow read, delete: if signedIn() && resource.data.userId == request.auth.uid;
      allow create: if signedIn() && request.resource.data.userId == request.auth.uid;
      allow update: if false;
    }
    match /settings/{uid} {
      allow read, write: if owner(uid);
    }
  }
}
```

---

## How to deploy to Google Cloud Run

### Option A — one command with Cloud Build (CI)

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# build, push, and deploy in one go
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions _VITE_FIREBASE_API_KEY=YOUR_API_KEY .
```

The `cloudbuild.yaml` builds the Docker image, pushes it to Artifact Registry (gcr.io), and runs `gcloud run deploy driveflow`. Any `_VITE_*` substitution you omit falls back to the defaults declared in the file (they match the Firebase project used by this repo).

### Option B — manual

```bash
docker build -t gcr.io/YOUR_PROJECT_ID/driveflow:latest \
  --build-arg VITE_FIREBASE_API_KEY=YOUR_API_KEY .
docker push gcr.io/YOUR_PROJECT_ID/driveflow:latest

gcloud run deploy driveflow \
  --image gcr.io/YOUR_PROJECT_ID/driveflow:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --platform managed
```

Or apply the declarative spec:

```bash
gcloud run services replace service.yaml
```

- The container listens on **port 8080** (nginx SPA config) and serves the static build with client-side routing fallback.
- Cloud Run scales to zero when idle, so it costs nothing between uses.
- `robots.txt` and `favicon.svg` ship in the image; the README and source files are excluded via `.dockerignore`.

### Alternative — Firebase Hosting

Because the build is fully static:

```bash
npm run build
firebase init hosting   # set public = dist, SPA rewrite to /
firebase deploy --only hosting
```

---

## Scripts

| Script          | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Start Vite dev server on :3000               |
| `npm run build` | Typecheck (`tsc --noEmit`) then production build |
| `npm run preview` | Preview the production build on :8080     |
| `npm run typecheck` | Run the TypeScript compiler only        |

---

## Backend & AI Journaling

In addition to secure Drive uploads, DriveFlow ships a **server-side backend** (`server/`) that powers the AI journal feature. The frontend remains a static SPA; all Gemini calls, Firestore journal persistence, and secret handling happen in the backend only.

### Architecture

```
Firebase Auth (frontend)
      ↓  (Firebase ID token)
Express Backend (server/)
      ↓  authenticateFirebaseUser middleware (Firebase Admin SDK)
      ↓
Gemini API (gemini service) ── key fetched from Google Cloud Secret Manager
      ↓
Firestore (users/{uid}/journalEntries, conversations, summaries)
      ↓
Google Drive / n8n automation (preserved)
```

### Security model

- **Firebase ID token verification** — every protected endpoint requires `Authorization: Bearer <Firebase ID Token>`. The backend verifies it with the Firebase Admin SDK and attaches the decoded UID to `req.user`.
- **UID-based authorization** — the verified UID is the only identity the backend trusts. Client-supplied `email`, `userId`, `uid`, or `username` values are **never** used for ownership or authorization.
- **Firestore isolation** — journal entries, conversations, and summaries are stored under `users/{uid}/...` and every query is scoped to the authenticated UID. User A cannot read or write User B's documents.
- **Secret Manager** — the Gemini API key is read from **Google Cloud Secret Manager** at runtime, cached in memory, and never returned to the client. It is never bundled into frontend code.
- **Backend-only Gemini access** — the frontend never talks to Gemini directly; it POSTs to `/api/chat` and receives the AI reply.
- **Secure n8n integration** — if an n8n webhook is used for Drive automation, it is only invoked by the backend after authentication, and its webhook secret lives only on the server.
- **Drive ownership is never client-controlled** — the backend derives the Drive destination from the **verified Firebase UID and email** only. Client-supplied `email`, `uid`, or `folderId` values are ignored for authorization, so a fake email cannot redirect exports to another user's Drive space.

### Folder structure

```
server/
├── index.ts                 # Express app, helmet, CORS, rate limits, routes
├── middleware/auth.ts       # Firebase ID token verification middleware
├── services/
│   ├── firebaseAdmin.ts     # Singleton Firebase Admin SDK init
│   ├── secretManager.ts     # Google Cloud Secret Manager wrapper (+ dev fallback)
│   ├── gemini.ts            # Gemini generateContent call
│   ├── journalService.ts    # Firestore journal/conversation/summary persistence
│   ├── driveExportService.ts# Firestore Drive export records + markdown builder
│   ├── driveTokenService.ts # Firestore Drive OAuth token records (per UID)
│   ├── driveTokenExchange.ts# Server-side refresh-token → access-token exchange
│   └── n8nService.ts        # n8n webhook caller for Drive automation
└── routes/
    ├── auth.ts              # POST /api/auth/verify
    ├── chat.ts              # POST /api/chat, GET /api/chat/conversations...
    ├── journal.ts           # CRUD journals, POST /:id/summarize, exports
    └── drive.ts             # POST /api/drive/token (refresh, cross-device)
```

### API endpoints

| Method | Endpoint                          | Auth required | Description                              |
| ------ | --------------------------------- | ------------- | ---------------------------------------- |
| GET    | `/api/health`                     | No            | Health check                             |
| POST   | `/api/auth/verify`                | Yes           | Verify a Firebase ID token               |
| POST   | `/api/chat`                       | Yes           | Send a message to Gemini (multi-turn)    |
| GET    | `/api/chat/conversations`         | Yes           | List the user's conversations            |
| GET    | `/api/chat/conversations/:id`     | Yes           | Get one conversation (owner only)        |
| POST   | `/api/journal`                    | Yes           | Create a journal entry                   |
| GET    | `/api/journal`                    | Yes           | List the user's journal entries          |
| GET    | `/api/journal/:id`                | Yes           | Get one journal entry (owner only)       |
| PUT    | `/api/journal/:id`                | Yes           | Update a journal entry (owner only)      |
| POST   | `/api/journal/:id/summarize`      | Yes           | Generate an AI summary + key points      |
| GET    | `/api/journal/summaries/list`     | Yes           | List the user's AI summaries             |
| POST   | `/api/journal/:id/export`         | Yes           | Export a journal to the user's Drive     |
| GET    | `/api/journal/exports/list`       | Yes           | List the user's Drive exports            |
| POST   | `/api/drive/token`                | Yes           | Get/refresh a Drive access token (per UID) |

All of these return non-disclosing errors like `{ "error": "Unauthorized" }`; detailed information is logged server-side only.

### Backend environment variables

```dotenv
# Firebase Admin SDK
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Google Cloud Secret Manager
GOOGLE_CLOUD_PROJECT=...
GEMINI_SECRET_NAME=gemini-api-key

# Development-only fallback (never in production)
DEV_gemini-api-key=YOUR_GEMINI_API_KEY

# Google OAuth web client (required only for cross-device Drive token refresh)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Server
PORT=3001
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

### Running the backend locally

```bash
npm install
# set the FIREBASE_* env vars above (e.g. via a .env file or your shell)
npm run dev:server        # http://localhost:3001  (tsx watch)
```

To run frontend + backend together:

```bash
npm run dev:all           # Vite on :3000 + backend on :3001, concurrently
```

### Production deployment (Google Cloud)

- Deploy the backend to **Cloud Run** using the same Firebase project's service account.
- Grant the runtime service account `roles/secretmanager.secretAccessor` on the Secret containing the Gemini API key.
- Store the Firebase Admin service-account key path via `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`, or point Firestore Admin at ambient credentials when running on GCP.
- `NODE_ENV=production` disables the `DEV_*` fallback: the server will refuse to start Gemini requests without a resolvable Secret Manager secret.

### AI summaries

When `POST /api/journal/:id/summarize` is called, Gemini generates a summary with key points and action items. The result is stored both on the journal entry and under `users/{uid}/summaries/{summaryId}`:

```
users/
  {uid}/
    journalEntries/{entryId}
    conversations/{conversationId}
    summaries/{summaryId}
```

---

## Scripts

| Script          | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Start Vite dev server on :3000               |
| `npm run dev:server` | Start backend on :3001 (tsx watch)      |
| `npm run dev:all` | Run frontend + backend concurrently       |
| `npm run build` | Typecheck (`tsc --noEmit`) then production build |
| `npm run build:server` | Compile backend to `dist-server/`       |
| `npm run preview` | Preview the production build on :8080     |
| `npm run test` | Run the backend security + service tests     |
| `npm run typecheck` | Run the TypeScript compiler only        |
| `npm run typecheck:server` | Typecheck the backend only            |

---

## License

[MIT](./LICENSE)

Built with React 19, Firebase, and a whole lot of gradient.
