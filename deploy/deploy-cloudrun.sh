# Deploy DriveFlow (full-stack) to Google Cloud Run.
# Assumes gcloud is installed + authenticated, and Docker is available.
# Docs: https://cloud.google.com/run/docs/deploying

set -e

PROJECT_ID="n8nsampleproject-ff2c5"
REGION="us-central1"
SERVICE="driveflow"
IMAGE="gcr.io/$PROJECT_ID/$SERVICE"

# ---- Frontend build-time args (public client config) ----
VITE_FIREBASE_API_KEY="AIzaSyBzKdIN18fLbkZR67CHzBBKkr2jf2OpbWg"
VITE_FIREBASE_AUTH_DOMAIN="n8nsampleproject-ff2c5.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="n8nsampleproject-ff2c5"
VITE_FIREBASE_STORAGE_BUCKET="n8nsampleproject-ff2c5.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="984526389105"
VITE_FIREBASE_APP_ID="1:984526389105:web:ceb065d624b8f17ab780d0"
VITE_FIREBASE_MEASUREMENT_ID="G-LTEHW0ZLRS"
VITE_GOOGLE_CLIENT_ID="984526389105-78jesfj2ga9htpi8f8uuqqnchr3nj607.apps.googleusercontent.com"
VITE_API_BASE_URL=""    # empty => same-origin in production

echo ">> gcloud auth (if needed): gcloud auth login / gcloud auth application-default login"
echo ">> Building image: $IMAGE"

gcloud builds submit --project "$PROJECT_ID" --region "$REGION" \
  --dockerfile Dockerfile.cloudrun \
  --tag "$IMAGE:latest" . || \
  gcloud builds submit --project "$PROJECT_ID" \
    --config cloudbuild.yaml . 

echo ">> Deploying to Cloud Run: $SERVICE in $REGION"

gcloud run deploy "$SERVICE" \
  --project "$PROJECT_ID" \
  --image "$IMAGE:latest" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 20 \
  --port 8080 \
  --set-env-vars "NODE_ENV=production,APP_BASE_URL=https://$(gcloud run services describe $SERVICE --region=$REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null || echo PLACEHOLDER),CORS_ORIGIN=*" \
  --set-secrets "GOOGLE_CLIENT_SECRET=google-oauth-client-secret:latest,DEV_GEMINI_API_KEY=gemini-api-key:latest,FIREBASE_PRIVATE_KEY=firebase-admin-private-key:latest,FIREBASE_CLIENT_EMAIL=firebase-admin-client-email:latest,FIREBASE_PROJECT_ID=firebase-admin-project-id:latest,OAUTH_STATE_SECRET=oauth-state-secret:latest"

echo ">> Deployment complete."
echo ">> After deploy, set GOOGLE_REDIRECT_URI and verified settings; see GUIDE.md"
