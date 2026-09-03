# Deploy DriveFlow (full-stack) to Google Cloud Run.
# Run in PowerShell from the project root:  .\deploy\deploy-cloudrun.ps1
# Pre-reqs: gcloud + Docker installed and authenticated (gcloud auth login).
# Phase 1 builds + deploys. Phase 2 sets the runtime env with the real URL.

$ErrorActionPreference = "Stop"

$PROJECT_ID = "n8nsampleproject-ff2c5"
$REGION     = "us-central1"
$SERVICE    = "driveflow"

function Get-EnvVal([string]$key) {
  $line = Get-Content ".env" | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
  if (-not $line) { return "" }
  $val = $line.Substring($line.IndexOf("=") + 1).Trim()
  if ($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length - 2) }
  return $val
}

# ---- PHASE 1: build + deploy (no URL needed yet) ----
Write-Host ">> Phase 1: Building via Cloud Build (Dockerfile.cloudrun)..." -ForegroundColor Cyan
gcloud builds submit --project $PROJECT_ID --region $REGION --dockerfile Dockerfile.cloudrun --tag "gcr.io/$PROJECT_ID/$SERVICE`:latest" .

Write-Host ">> Phase 1: Deploying $SERVICE..." -ForegroundColor Cyan
gcloud run deploy $SERVICE `
  --project $PROJECT_ID `
  --image "gcr.io/$PROJECT_ID/$SERVICE`:latest" `
  --region $REGION `
  --platform managed `
  --allow-unauthenticated `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 20 `
  --port 8080 `
  --set-env-vars "NODE_ENV=production,CORS_ORIGIN=*,GOOGLE_CLIENT_ID=984526389105-78jesfj2ga9htpi8f8uuqqnchr3nj607.apps.googleusercontent.com,FIREBASE_PROJECT_ID=$(Get-EnvVal FIREBASE_PROJECT_ID),FIREBASE_CLIENT_EMAIL=$(Get-EnvVal FIREBASE_CLIENT_EMAIL),FIREBASE_PRIVATE_KEY=$(Get-EnvVal FIREBASE_PRIVATE_KEY),GOOGLE_CLIENT_SECRET=$(Get-EnvVal GOOGLE_CLIENT_SECRET),DEV_GEMINI_API_KEY=$(Get-EnvVal DEV_GEMINI_API_KEY),OAUTH_STATE_SECRET=$(Get-EnvVal OAUTH_STATE_SECRET)"

# Get the real URL now that the service exists.
$URL = (gcloud run services describe $SERVICE --project $PROJECT_ID --region $REGION --format="value(status.url)")
Write-Host ">> Service URL: $URL" -ForegroundColor Yellow

# ---- PHASE 2: set URL-dependent env (APP_BASE_URL + OAuth redirect) ----
Write-Host ">> Phase 2: Setting APP_BASE_URL + OAuth redirect URI..." -ForegroundColor Cyan
gcloud run services update $SERVICE `
  --project $PROJECT_ID `
  --region $REGION `
  --update-env-vars "APP_BASE_URL=$URL,GOOGLE_REDIRECT_URI=$URL/api/drive/oauth/callback"

Write-Host "`n>> Deployment complete." -ForegroundColor Green
Write-Host "Open: $URL"
Write-Host "Then follow deploy/GUIDE.md to finalize OAuth/authorized domains in the Console."