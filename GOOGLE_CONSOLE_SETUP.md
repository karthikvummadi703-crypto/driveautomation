# Google Cloud Console Setup Guide

This guide will help you set up your Google Cloud project to make DriveFlow fully functional without OAuth verification issues.

## Prerequisites

- Google Cloud account with project ID: `984526389105`
- Developer email: `karthikvummadi2007@gmail.com`

## Step 1: Configure OAuth Consent Screen

### 1.1 Access OAuth Consent Screen
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `984526389105`
3. Navigate to **APIs & Services** → **OAuth consent screen**

### 1.2 Choose User Type
- Select **External** (for production use)
- Click **Create**

### 1.3 Fill in App Information
- **App name**: DriveFlow
- **User support email**: karthikvummadi2007@gmail.com
- **Developer contact email**: karthikvummadi2007@gmail.com
- Click **Save and Continue**

### 1.4 Scopes (Critical Step)
Add the following scopes:
```
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/drive.metadata.readonly
https://www.googleapis.com/auth/drive.activity.readonly
```

Click **Add or Remove Scopes**, search for each scope, add them, then click **Update** and **Save and Continue**.

### 1.5 Test Users (For Development)
1. Scroll down to **Test users**
2. Click **Add users**
3. Add your email: `karthikvummadi2007@gmail.com`
4. Add any other test users as needed
5. Click **Save**

### 1.6 Summary & Publish
1. Review all settings
2. Click **Back to Dashboard**
3. **For development**: Keep app in "Testing" mode
4. **For production**: Click **Submit App for Verification** (requires business verification)

## Step 2: Create OAuth 2.0 Credentials

### 2.1 Create OAuth Client ID
1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. **Application type**: Web application
4. **Name**: DriveFlow Web Client

### 2.2 Configure Authorized JavaScript Origins
Add these URLs (adjust for your environment):
```
http://localhost:3000
http://localhost:5173
https://your-domain.com
```

### 2.3 Configure Authorized Redirect URIs
Add these URLs:
```
http://localhost:3000
http://localhost:5173
https://your-domain.com
```

### 2.4 Save Credentials
1. Click **Create**
2. **Copy the Client ID** - you'll need this for `.env`
3. **Copy the Client Secret** - you'll need this for backend `.env`

## Step 3: Enable Required APIs

### 3.1 Enable Google Drive API
1. Navigate to **APIs & Services** → **Library**
2. Search for "Google Drive API"
3. Click on it and click **Enable**

### 3.2 Enable Drive Activity API
1. Search for "Drive Activity API"
2. Click on it and click **Enable**

### 3.3 Enable Gemini API (for AI features)
1. Search for "Generative Language API"
2. Click on it and click **Enable**

## Step 4: Configure Firebase Authentication

### 4.1 Enable Google Sign-in
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `n8nsampleproject-ff2c5`
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Google** sign-in
5. Add the OAuth Client ID from Step 2.4
6. Add the Client Secret from Step 2.4
7. Make sure the Drive scopes are added in the Firebase Google provider configuration

### 4.2 Configure Authorized Domains
1. In Firebase Console → **Project Settings**
2. Scroll to **Your apps** → **Your apps**
3. Add your development and production domains

## Step 5: Update Environment Variables

### 5.1 Frontend `.env`
```env
VITE_GOOGLE_CLIENT_ID=your-oauth-client-id-from-step-2.4
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=n8nsampleproject-ff2c5.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=n8nsampleproject-ff2c5
VITE_FIREBASE_STORAGE_BUCKET=n8nsampleproject-ff2c5.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=984526389105
VITE_FIREBASE_APP_ID=1:984526389105:web:ceb065d624b8f17ab780d0
VITE_FIREBASE_MEASUREMENT_ID=G-LTEHW0ZLRS
```

### 5.2 Backend `.env`
```env
GOOGLE_CLIENT_ID=your-oauth-client-id-from-step-2.4
GOOGLE_CLIENT_SECRET=your-oauth-client-secret-from-step-2.4
FIREBASE_PROJECT_ID=n8nsampleproject-ff2c5
FIREBASE_CLIENT_EMAIL=your-firebase-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GOOGLE_CLOUD_PROJECT=984526389105
GEMINI_SECRET_NAME=gemini-api-key
DEV_gemini-api-key=your-gemini-api-key-for-development
PORT=3001
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

## Step 6: Production Deployment Checklist

### 6.1 OAuth Verification
- Complete Google's OAuth verification process
- Provide required business verification documents
- Submit privacy policy and terms of service URLs
- Wait for Google approval (can take several days)

### 6.2 Domain Verification
- Verify your domain in Google Search Console
- Add domain to Firebase authorized domains
- Update OAuth consent screen with production URLs

### 6.3 Security Setup
- Use Firebase Admin SDK service account
- Store API keys in Google Cloud Secret Manager
- Set up proper IAM roles for Cloud Run services

## Step 7: Testing Checklist

### 7.1 Local Development
- [ ] Email registration works
- [ ] Email verification sends and works
- [ ] Google sign-in works
- [ ] Drive connection works for Google users
- [ ] Drive connection works for email users
- [ ] File uploads work
- [ ] AI chat responds correctly
- [ ] Cross-device sync works

### 7.2 Production Testing
- [ ] All authentication flows work on production domain
- [ ] Drive connection persists across sessions
- [ ] File uploads succeed in production
- [ ] AI features work with production configuration
- [ ] No "unverified app" warnings for test users

## Troubleshooting

### OAuth Verification Screen
**Problem**: "Google hasn't verified this app" screen appears

**Solutions**:
1. **Immediate workaround**: Click "Advanced" → "Go to DriveFlow (unsafe)"
2. **Add test users**: Add your email to OAuth consent screen test users
3. **Submit for verification**: Complete OAuth verification for production

### Drive API Errors
**Problem**: "Google Drive API has not been used"

**Solution**:
1. Enable Google Drive API in Google Cloud Console
2. Wait 5-10 minutes for changes to propagate
3. Reconnect Drive from settings

### Token Refresh Issues
**Problem**: Drive connection expires frequently

**Solution**:
1. Ensure refresh tokens are being stored correctly
2. Check OAuth client configuration includes `access_type: offline`
3. Verify token refresh logic in backend

### CORS Errors
**Problem**: CORS errors when calling backend

**Solution**:
1. Update `CORS_ORIGIN` in backend `.env`
2. Ensure frontend URL is added to OAuth authorized origins
3. Check Firebase authorized domains configuration

## Important Notes

1. **Testing Mode**: While in testing mode, only added test users can use the app without warnings
2. **Verification Process**: OAuth verification can take several days and requires business documents
3. **Scope Security**: Only request necessary scopes (we use `drive.file` which is least-privilege)
4. **Rate Limits**: Be aware of Google API rate limits during development
5. **Key Security**: Never commit API keys or secrets to version control

## Quick Start for Development

If you just want to test the app immediately:

1. Add your email to test users in OAuth consent screen
2. Use the "Advanced → Go to DriveFlow (unsafe)" workaround
3. Keep the app in testing mode during development
4. Only submit for verification when ready for production

## Support Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Firebase Console](https://console.firebase.google.com/)

---

*This guide assumes you're using the existing project configuration. Adjust values as needed for your specific setup.*