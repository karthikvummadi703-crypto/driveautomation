# Deploying DriveFlow to Google Cloud Run — Step by Step

This guide deploys the **full-stack** DriveFlow app (frontend + backend API) as a
single Cloud Run service. It requires **no change to your application code** —
all deploy files are additive.

---

## 0. What the deploy files do (you don't need to understand these fully)

| File | Purpose |
|------|---------|
| `server/cloudrun.ts` | Deploy-only entrypoint. Reuses the existing backend and additionally serves the built frontend. `server/index.ts` is **unchanged**. |
| `Dockerfile.cloudrun` | Builds the frontend + backend into a single container that runs `cloudrun.js` on port 8080. |
| `.dockerignore` | Keeps secrets/dev files out of the build context. |
| `deploy/deploy-cloudrun.ps1` | One-click deploy script (PowerShell, for this Windows machine). |

---

## 1. Prerequisites (do once)

1. Install **Google Cloud SDK (gcloud)** → https://cloud.google.com/sdk/docs/install
2. Install **Docker Desktop** → https://www.docker.com/products/docker-desktop/
3. Authenticate gcloud:
   ```powershell
   gcloud auth login
   gcloud config set project n8nsampleproject-ff2c5
   ```
4. Make sure billing is enabled on the project (required for Cloud Run/Build).

---

## 2. Deploy (one command)

From the project root (`C:\Users\Karthik\driveautomation`):

```powershell
.\deploy\deploy-cloudrun.ps1
```

This:
1. Builds the image with Cloud Build (reads your `.env` for secrets).
2. Deploys the `driveflow` service to Cloud Run (*us-central1*).
3. Prints your service URL (e.g. `https://driveflow-xxxx-a.run.app`).
4. Sets `APP_BASE_URL` + `GOOGLE_REDIRECT_URI` to that URL.

> If the script's secret parsing is troublesome, run the underlying
> `gcloud builds submit` + `gcloud run deploy` commands in GUIDE section 4.

---

## 3. Sanity-check the deploy

Open your service URL in a browser:
- You should see the DriveFlow login page.
- `https://<YOUR-URL>/api/health` should return `{"status":"ok"}`.

---

## 4. Manual deploy (if the script doesn't work for you)

Build + push:
```powershell
gcloud builds submit --project n8nsampleproject-ff2c5 --region us-central1 `
  --dockerfile Dockerfile.cloudrun --tag gcr.io/n8nsampleproject-ff2c5/driveflow:latest .
```

Deploy:
```powershell
$URL = "https://<YOUR-FINAL-URL>"
gcloud run deploy driveflow `
  --project n8nsampleproject-ff2c5 --region us-central1 `
  --image gcr.io/n8nsampleproject-ff2c5/driveflow:latest `
  --platform managed --allow-unauthenticated --memory 512Mi --cpu 1 `
  --min-instances 0 --max-instances 20 --port 8080 `
  --set-env-vars "NODE_ENV=production,CORS_ORIGIN=*,GOOGLE_CLIENT_ID=984526389105-78jesfj2ga9htpi8f8uuqqnchr3nj607.apps.googleusercontent.com,FIREBASE_PROJECT_ID=n8nsampleproject-ff2c5,FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@n8nsampleproject-ff2c5.iam.gserviceaccount.com,FIREBASE_PRIVATE_KEY=<YOUR_PRIVATE_KEY>,GOOGLE_CLIENT_SECRET=<YOUR_SECRET>,DEV_GEMINI_API_KEY=<YOUR_KEY>,OAUTH_STATE_SECRET=<YOUR_STATE>" `
  --update-env-vars "APP_BASE_URL=$URL,GOOGLE_REDIRECT_URI=$URL/api/drive/oauth/callback"
```

> `FIREBASE_PRIVATE_KEY` contains `\n` — keep the literal `\n` (not real newlines)
> so the app's existing `.replace(/\\n/g, '\n')` decodes it.

---

## 5. After deploy — fix Google OAuth (removes the "not verified" warning)

These are the **Console changes** you mentioned wanting to do after deploy:

### A. Firebase Authentication — authorized domains
1. **Firebase Console** → Authentication → **Settings** → **Authorized domains**
2. Add your Cloud Run domain (e.g. `driveflow-xxxx-a.run.app`).
> Without this, Google sign-in fails with "this domain is not authorized."

### B. Google Cloud — OAuth redirect + origins for Drive
1. **Google Cloud Console** → APIs & Services → **Credentials**
2. Open the OAuth web client
   (`984526389105-78jesfj2ga9htpi8f8uuqqnchr3nj607...`).
3. **Authorized JavaScript origins:** add `https://<YOUR-URL>`
4. **Authorized redirect URIs:** add `https://<YOUR-URL>/api/drive/oauth/callback`
5. Save. (Keep `http://localhost` entries for local dev.)

### C. OAuth consent screen — publish / test users
1. **Google Cloud Console** → APIs & Services → **OAuth consent screen**
2. Set status from **Testing** → **In production** (so real users can log in).
3. Add your Google sign-in test emails under **Test users** if you stay in Testing.
> Fully removing the warning for everyone requires Google's app verification
> (privacy policy + domain verification) — see the separate guidance.

---

## 6. Keeping secrets safe (recommended later)

Right now secrets are plain env vars on the service. For production, move them
to **Secret Manager** (`gcloud secrets create ...` + `--set-secrets`). Not
required for getting your deployment running.
