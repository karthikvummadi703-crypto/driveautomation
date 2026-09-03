# Deploying DriveFlow to Vercel — Step by Step

Vercel hosts your **frontend** (the React build) and runs your **Express backend**
as a serverless function (`/api/*`). No card required for hobby projects.

> **Known limitation:** the AI chat uses SSE streaming (`/api/chat/stream`).
> Vercel supports streaming but serverless functions have a timeout
> (60s on Hobby, up to 300s on paid). Long AI responses can occasionally cut
> off. Functionality works for normal use.

---

## What was prepared (no application code changed)

| File | Purpose |
|------|---------|
| `api/index.ts` | Serverless entrypoint — exports the existing Express app for Vercel. |
| `vercel.json` | Routes `/api/*` to the function; serves the frontend otherwise. |

App code (`src/`, `server/`) is **unchanged**.

---

## 1. Push the project to GitHub (recommended)

Vercel deploys best from a git repo. If you don't have one yet:

```powershell
cd C:\Users\Karthik\driveautomation
git init
git add -A
git commit -m "DriveFlow initial"
# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/driveflow.git
git push -u origin main
```

> Your `.env` is gitignored, so secrets stay out of the repo. Good.

---

## 2. Create the Vercel project

1. Go to **https://vercel.com** → sign in with GitHub (or email).
2. Click **Add New → Project**.
3. Import your `driveflow` repo.
4. Framework preset: Vercel auto-detects **Vite**. Leave it.
5. Do **not** change build/output settings (they're in `vercel.json`).

### Set Environment Variables (critical) — in the project's Settings → Environment Variables

| Name | Value |
|------|-------|
| `VITE_API_BASE_URL` | *(leave empty — enables same-origin `/api` calls)* |
| `VITE_FIREBASE_API_KEY` | `AIzaSyBzKdIN18fLbkZR67CHzBBKkr2jf2OpbWg` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `n8nsampleproject-ff2c5.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `n8nsampleproject-ff2c5` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `n8nsampleproject-ff2c5.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `984526389105` |
| `VITE_FIREBASE_APP_ID` | `1:984526389105:web:ceb065d624b8f17ab780d0` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-LTEHW0ZLRS` |
| `VITE_GOOGLE_CLIENT_ID` | `984526389105-78jesfj2ga9htpi8f8uuqqnchr3nj607.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_ID` | *(same as above — backend)* |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` (from your `.env`) |
| `FIREBASE_PROJECT_ID` | `n8nsampleproject-ff2c5` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-fbsvc@n8nsampleproject-ff2c5.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | the long `-----BEGIN PRIVATE KEY-----...` value (keep the literal `\n`) |
| `DEV_GEMINI_API_KEY` | `AQ.Ab8R...` (from `.env`) |
| `OAUTH_STATE_SECRET` | any strong random string |
| `APP_BASE_URL` | your Vercel URL (set after first deploy) |
| `CORS_ORIGIN` | `*` |

> Set them for **Production**, **Preview**, and **Development** (or use the "all" option).

6. Click **Deploy**.

---

## 3. Verify

After deploy, open `https://<your-project>.vercel.app`:
- Login page loads.
- `https://<your-project>.vercel.app/api/health` → `{"status":"ok"}`

---

## 4. After deploy — Console changes (remove "not verified" warning + fix login)

### A. Firebase Authentication — authorized domains
1. Firebase Console → **Authentication** → **Settings**
2. **Authorized domains** → **Add domain** → `your-project.vercel.app`
3. Save.

### B. Google Cloud — OAuth web client (Drive + Google login)
1. Google Cloud Console → **APIs & Services** → **Credentials**
2. Edit the OAuth **Web client** (`...78jesfj2ga9htpi8f8uuqqnchr3nj607...`)
3. **Authorized JavaScript origins:** add `https://your-project.vercel.app`
4. **Authorized redirect URIs:** add `https://your-project.vercel.app/api/drive/oauth/callback`
5. Save.

### C. OAuth consent screen — publish for all users
1. Google Cloud Console → **OAuth consent screen**
2. **PUBLISH APP** (add app name, support email, privacy policy URL).
> Publishing lets everyone sign in; full Google **verification** (privacy policy +
> domain verification + review) removes the "hasn't been verified" warning.

---

## 5. Redeploy after env changes
Any time you change env vars in Vercel:
- Settings → Environment Variables → save → then **Redeploy** from the Deployments tab.
- Vite build vars (`VITE_*`) require a **rebuild**, so redeploy after changing them.

---

## Troubleshooting
- **API 404 / frontend serves instead:** ensure `vercel.json` has the `/api/(.*)`
  rewrite (already configured). Redeploy after any change.
- **Google sign-in "domain not authorized":** finish step 4A.
- **Drive connect redirect loop:** finish step 4B (add the redirect URI).
- **Chat streams but stops early:** Vercel function timeout — acceptable on
  Hobby for short chats; consider Cloud Run or a longer-timeout platform for
  production-grade long answers.
