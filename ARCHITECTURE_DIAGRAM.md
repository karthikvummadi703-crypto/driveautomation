# DriveFlow Architecture Diagram

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DRIVEFLOW SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        FRONTEND (React SPA)                          │   │
│  │  React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        BACKEND (Express)                             │   │
│  │  Node.js + Firebase Admin + Gemini AI + Secret Manager              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        EXTERNAL SERVICES                             │   │
│  │  Firebase Auth/Firestore, Google Drive API, Gemini API, n8n          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Detailed Component Architecture

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  App.tsx (Provider Stack)                                            │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ ThemeProvider → ToastProvider → AuthProvider → DriveProvider │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                                    │                                    │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │         RouterProvider (React Router v7)                      │  │   │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │   │
│  │  │  │ PublicLayout → LandingPage                             │  │  │   │
│  │  │  │ AuthLayout → Login/Register/ForgotPassword              │  │  │   │
│  │  │  │ ProtectedRoute → DashboardLayout                        │  │  │   │
│  │  │  │   ├── Dashboard, Upload, History, Settings, Chat        │  │  │   │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Context Layer (State Management)                                      │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ AuthContext: User authentication, profile management            │  │  │
│  │  │ DriveContext: Google Drive OAuth token management               │  │   │
│  │  │ ThemeContext: Light/dark mode persistence                      │  │   │
│  │  │ ToastContext: Global notification system                       │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Service Layer (Business Logic)                                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ uploadService.ts: Google Drive API calls (Axios)               │  │   │
│  │  │ firestoreService.ts: Firestore data operations                 │  │   │
│  │  │ driveService.ts: Drive token management                        │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Firebase Client SDK Layer                                             │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ firebase/app.ts: Firebase initialization                       │  │   │
│  │  │ firebase/auth.ts: Authentication methods                       │  │   │
│  │  │ firebase/firestore.ts: Database operations                      │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Backend Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Express Server (server/index.ts)                                      │   │
│  │  - Helmet (security headers)                                           │   │
│  │  - CORS configuration                                                  │   │
│  │  - Rate limiting (API, chat, Drive)                                    │   │
│  │  - Request timeout (60s)                                               │   │
│  │  - Structured logging                                                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Middleware Layer                                                     │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ auth.ts: Firebase ID token verification                        │  │   │
│  │  │ - Verifies Firebase ID tokens                                  │  │   │
│  │  │ - Attaches decoded UID to req.user                              │  │   │
│  │  │ - Requires verified email for protected routes                 │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Routes Layer                                                          │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ /api/auth: Firebase token verification                         │  │   │
│  │  │ /api/chat: AI chat with RAG                                    │  │   │
│  │  │ /api/journal: Journal CRUD + AI summaries + exports            │  │   │
│  │  │ /api/drive: Cross-device Drive token refresh                   │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Services Layer                                                        │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ gemini.ts: Gemini AI API integration                            │  │   │
│  │  │ - Secret Manager API key retrieval                              │  │   │
│  │  │ - Multi-turn conversation handling                              │  │   │
│  │  │ - Model fallback (2.0-flash → 1.5-flash)                        │  │   │
│  │  ├────────────────────────────────────────────────────────────────┤  │   │
│  │  │ journalService.ts: Firestore journal operations                 │  │   │
│  │  │ - Journal entries CRUD                                           │  │   │
│  │  │ - Conversation management                                        │  │   │
│  │  │ - AI summary storage                                             │  │   │
│  │  ├────────────────────────────────────────────────────────────────┤  │   │
│  │  │ ragService.ts: Retrieval Augmented Generation                    │  │   │
│  │  │ - User Drive document retrieval                                  │  │   │
│  │  │ - Context building for AI responses                              │  │   │
│  │  ├────────────────────────────────────────────────────────────────┤  │   │
│  │  │ driveExportService.ts: Drive export operations                   │  │   │
│  │  │ - Markdown export generation                                     │  │   │
│  │  │ - Export record management                                       │  │   │
│  │  ├────────────────────────────────────────────────────────────────┤  │   │
│  │  │ n8nService.ts: n8n webhook integration                           │  │   │
│  │  │ - Journal export automation                                      │  │   │
│  │  ├────────────────────────────────────────────────────────────────┤  │   │
│  │  │ secretManager.ts: Google Cloud Secret Manager                   │  │   │
│  │  │ - API key retrieval with dev fallback                            │  │   │
│  │  ├────────────────────────────────────────────────────────────────┤  │   │
│  │  │ firebaseAdmin.ts: Firebase Admin SDK initialization             │  │   │
│  │  │ - Firestore admin operations                                     │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Authentication Flow

```
┌──────────────┐
│   User       │
└──────┬───────┘
       │
       │ 1. Click "Sign in with Google"
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Frontend: AuthContext.signInWithGoogle()                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Firebase Auth: Google popup with drive.file scope                      │ │
│  │ - User grants Drive permissions                                        │ │
│  │ - Returns Google OAuth access token                                    │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    │ 2. Extract Google access token        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ DriveContext: Auto-connect Drive                                     │ │
│  │ - Store token in localStorage & Firestore (driveTokens collection)    │ │
│  │ - Update user profile with connectedDriveEmail                        │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    │ 3. Refresh user profile               │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Firestore: users/{uid} document                                       │ │
│  │ - Create default profile if doesn't exist                             │ │
│  │ - Update display name, photo URL from Google                          │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 4. Auth state change
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  UI Update: Redirect to Dashboard with authenticated state                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. File Upload Flow

```
┌──────────────┐
│   User       │
└──────┬───────┘
       │
       │ 1. Select file + click upload
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Frontend: Upload.tsx                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Validation: File size (max 16MB), type check                          │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    │ 2. Request Drive access token         │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ DriveContext.getAccessToken()                                        │ │
│  │ - Check localStorage for cached token                                  │ │
│  │ - If expired, trigger Google re-auth popup                            │ │
│  │ - Return fresh access token                                            │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    │ 3. Upload to Google Drive API          │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ uploadService.uploadFileToDrive()                                     │ │
│  │ - Build multipart/related body (metadata + file bytes)               │ │
│  │ - POST to https://www.googleapis.com/upload/drive/v3/files            │ │
│  │ - Authorization: Bearer <user_token>                                  │ │
│  │ - Track upload progress via onUploadProgress                           │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    │ 4. Google Drive response               │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Google Drive API                                                        │ │
│  │ - Returns file ID, name, webViewLink                                  │ │
│  │ - File stored in USER'S OWN Google Drive                               │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    │ 5. Store upload record                 │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Firestore: uploadHistory collection                                    │ │
│  │ - Document: { userId, fileName, fileSize, driveLink, status, ... }   │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    │ 6. Show success                        │
│                                    ▼                                        │
┌─────────────────────────────────────────────────────────────────────────────┐
│  UI: Display success modal with Drive link                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. AI Chat with RAG Flow

```
┌──────────────┐
│   User       │
└──────┬───────┘
       │
       │ 1. Send message in Chat UI
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Frontend: Chat.tsx → POST /api/chat                                        │
│  Headers: Authorization: Bearer <Firebase ID Token>                        │
│  Body: { message, conversationId? }                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 2. Verify Firebase token
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Backend: authenticateFirebaseUser middleware                              │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Firebase Admin SDK: Verify ID token                                  │ │
│  │ - Decode token, extract UID                                            │ │
│  │ - Attach req.user = { uid, email }                                     │ │
│  │ - Check email verification status                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 3. Retrieve user's Drive context
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Backend: ragService.retrieveUserDriveContext(uid, message)                 │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ - Query user's Drive exports from Firestore                           │ │
│  │ - Search relevant documents based on message content                  │ │
│  │ - Build context string for AI                                         │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 4. Build system instruction
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Backend: ragService.buildSystemInstruction(ragResult)                       │
│  - Combine retrieved context with system prompt                             │
│  - Guide AI to use user's actual data                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 5. Call Gemini AI
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Backend: gemini.chatWithGemini()                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Secret Manager: Get Gemini API key                                    │ │
│  │ - Production: Google Cloud Secret Manager                              │ │
│  │ - Development: DEV_GEMINI_API_KEY fallback                             │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    │ 6. Gemini API call                     │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ POST https://generativelanguage.googleapis.com/v1beta/models/...      │ │
│  │ - Include conversation history (multi-turn)                           │ │
│  │ - Include system instruction with RAG context                         │ │
│  │ - Model: gemini-2.0-flash (fallback to 1.5-flash)                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    │ 7. AI response                         │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Gemini API returns AI reply + updated conversation history            │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 8. Store conversation
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Backend: journalService                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Firestore: users/{uid}/conversations/{conversationId}                │ │
│  │ - Store user message + AI response with timestamps                   │ │
│  │ - Create new conversation if conversationId not provided             │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 9. Return response
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Frontend: Display AI reply + sources used from RAG                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4. Journal Creation & AI Summary Flow

```
┌──────────────┐
│   User       │
└──────┬───────┘
       │
       │ 1. Create journal entry
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Frontend: POST /api/journal                                                │
│  Headers: Authorization: Bearer <Firebase ID Token>                          │
│  Body: { title, content }                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 2. Backend auth verification
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Backend: journalService.createJournalEntry(uid, entry)                     │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Firestore: users/{uid}/journalEntries/{entryId}                      │ │
│  │ - Store title, content, createdAt, updatedAt                         │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 3. User requests AI summary
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Frontend: POST /api/journal/:id/summarize                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 4. Backend generates summary
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Backend: gemini.chatWithGemini()                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ System instruction: "Create JSON summary with summary, keyPoints,    │ │
│  │                    actionItems fields"                                 │ │
│  │ Message: Journal title + content                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    │ 5. Parse AI response                  │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Extract JSON: { summary, keyPoints[], actionItems[] }                 │ │
│  │ Fallback to plain text if JSON parsing fails                         │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 6. Store summary
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Backend: journalService                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Update journal entry with summary fields                             │ │
│  │ Create separate document in users/{uid}/summaries/{summaryId}        │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 7. Return summary
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Frontend: Display AI summary with key points and action items              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5. Journal Export to Drive Flow

```
┌──────────────┐
│   User       │
└──────┬───────┘
       │
       │ 1. Request journal export
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Frontend: POST /api/journal/:id/export                                      │
│  Headers: Authorization: Bearer <Firebase ID Token>                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 2. Backend auth verification
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Backend: driveExportService.buildJournalExportMarkdown()                    │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Generate markdown with:                                             │ │
│  │ - Journal title, content, summary                                   │ │
│  │ - Key points, action items                                          │ │
│  │ - User email, export timestamp                                       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    │ 3. Create export record               │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Firestore: users/{uid}/driveExports/{exportId}                       │ │
│  │ - status: 'pending'                                                  │ │
│  │ - fileName, journalEntryId, source                                  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 4. Call n8n webhook
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Backend: n8nService.callN8nExport()                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ POST to n8n webhook URL (from env)                                   │ │
│  │ Body: { uid, journalEntryId, fileName, markdown, email }            │ │
│  │ - n8n handles Drive upload using user's authenticated context       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 5. Update export status
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Backend: Update export record to status: 'success' or 'failed'            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 6. Return result
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Frontend: Display export success/failure message                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Firestore Collections

```
users/{uid}
├── uid: string
├── email: string
├── displayName: string
├── photoURL: string?
├── provider: 'google.com' | 'password'
├── connectedDriveEmail: string?
├── createdAt: string (ISO timestamp)
└── settings: { theme: 'dark' | 'light', ... }

uploadHistory/{docId}
├── userId: string
├── email: string
├── fileName: string
├── fileSize: number
├── fileType: string
├── driveLink: string
├── status: 'success' | 'failed'
└── uploadedAt: string (ISO timestamp)

driveTokens/{uid}
├── uid: string
├── accessToken: string
├── refreshToken: string?
├── expiresAt: string (ISO timestamp)
├── driveEmail: string
└── updatedAt: string (ISO timestamp)

users/{uid}/journalEntries/{entryId}
├── id: string
├── title: string
├── content: string
├── summary: string?
├── keyPoints: string[]
├── actionItems: string[]
├── createdAt: string (ISO timestamp)
└── updatedAt: string (ISO timestamp)

users/{uid}/conversations/{conversationId}
├── id: string
├── title: string
├── messages: [
│   { role: 'user' | 'model', content: string, timestamp: string }
│ ]
└── createdAt: string (ISO timestamp)

users/{uid}/summaries/{summaryId}
├── id: string
├── journalEntryId: string
├── conversationId: string
├── title: string
├── summary: string
├── keyPoints: string[]
├── actionItems: string[]
└── createdAt: string (ISO timestamp)

users/{uid}/driveExports/{exportId}
├── id: string
├── journalEntryId: string
├── source: 'journal'
├── fileName: string
├── status: 'pending' | 'success' | 'failed'
├── error: string?
└── createdAt: string (ISO timestamp)
```

## Security Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY LAYERS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. FRONTEND SECURITY                                                        │
│     ┌────────────────────────────────────────────────────────────────────┐   │
│     │ Firebase Client SDK: Direct Firebase Auth + Firestore             │   │
│     │ - Only client can access user's own data                          │   │
│     │ - Firestore security rules enforce ownership                      │   │
│     └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  2. BACKEND AUTHENTICATION                                                   │
│     ┌────────────────────────────────────────────────────────────────────┐   │
│     │ Firebase ID Token Verification                                      │   │
│     │ - Every protected endpoint requires Bearer token                   │   │
│     │ - Firebase Admin SDK verifies token signature                       │   │
│     │ - UID is the only trusted identity                                  │   │
│     │ - Client-supplied emails/UIDs ignored for authorization            │   │
│     └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  3. DATA ISOLATION                                                           │
│     ┌────────────────────────────────────────────────────────────────────┐   │
│     │ Firestore Collection Structure                                     │   │
│     │ - All user data under users/{uid}/...                               │   │
│     │ - Queries always scoped to authenticated UID                       │   │
│     │ - Security rules prevent cross-user access                         │   │
│     └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  4. SECRET MANAGEMENT                                                        │
│     ┌────────────────────────────────────────────────────────────────────┐   │
│     │ Google Cloud Secret Manager                                         │   │
│     │ - Gemini API key stored in Secret Manager (production)             │   │
│     │ - Server runtime has secretAccessor role                            │   │
│     │ - Development fallback via DEV_GEMINI_API_KEY                      │   │
│     │ - Secrets never exposed to frontend                                │   │
│     └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  5. DRIVE OWNERSHIP                                                          │
│     ┌────────────────────────────────────────────────────────────────────┐   │
│     │ Per-User Google Drive OAuth                                          │   │
│     │ - Each user connects their own Drive via OAuth                      │   │
│     │ - Files uploaded to user's own Drive using their token             │   │
│     │ - No shared Drive pool or backend storage                           │   │
│     │ - Email/password users blocked from Drive features                 │   │
│     └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  6. RATE LIMITING & PROTECTION                                               │
│     ┌────────────────────────────────────────────────────────────────────┐   │
│     │ Express Rate Limiting                                               │   │
│     │ - API: 100 requests per 15 minutes                                 │   │
│     │ - Chat: 20 requests per minute                                      │   │
│     │ - Drive: 30 requests per minute                                     │   │
│     │ - Helmet security headers                                           │   │
│     │ - 60-second request timeout                                        │   │
│     └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  FRONTEND DEPLOYMENT                                                  │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ Build: Vite → static files in dist/                            │  │   │
│  │  │ Docker: Multi-stage build → nginx:alpine                      │  │   │
│  │  │ Runtime: nginx on port 8080 (SPA routing fallback)             │  │   │
│  │  │ Platform: Google Cloud Run                                     │  │   │
│  │  │ CI/CD: Cloud Build (cloudbuild.yaml)                            │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  BACKEND DEPLOYMENT                                                   │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │   │
│  │  │ Build: TypeScript → dist-server/                               │  │   │
│  │  │ Runtime: Node.js Express server on port 3001                   │  │   │
│  │  │ Platform: Google Cloud Run                                     │  │   │
│  │  │ IAM: Service account with Secret Manager access                │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  INFRASTRUCTURE                                                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ Firebase Project: Authentication + Firestore                    │  │   │
│  │  │ Google Cloud: Secret Manager + Cloud Run + Artifact Registry    │  │   │
│  │  │ n8n: Optional automation server (self-hosted or cloud)          │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Features Implementation

### 1. Per-User Google Drive Integration
- **Frontend**: Google OAuth with `drive.file` scope during sign-in
- **Token Storage**: localStorage + Firestore (driveTokens collection)
- **Upload Flow**: Direct browser-to-Google Drive API using user's OAuth token
- **Security**: No shared Drive pool, each user's files stay in their own Drive

### 2. AI-Powered Chat with RAG
- **Context Retrieval**: User's Drive exports fetched from Firestore
- **AI Integration**: Gemini API with conversation history
- **System Instructions**: Context-aware prompts using user's actual data
- **Multi-turn**: Conversation history maintained in Firestore

### 3. Journal with AI Summaries
- **CRUD Operations**: Full journal entry management
- **AI Summaries**: Gemini generates structured JSON summaries
- **Action Items**: Extracted and stored separately
- **Export Integration**: n8n webhook for Drive automation

### 4. Cross-Device Drive Connection
- **Token Persistence**: Drive tokens stored in Firestore per user
- **Auto-Connect**: Tokens restored on sign-in from any device
- **Refresh Handling**: Server-side token refresh when expired
- **Profile Sync**: Connected Drive email saved in user profile

## Technology Stack Summary

### Frontend
- **Framework**: React 19 + TypeScript
- **Build**: Vite 6
- **Styling**: Tailwind CSS 3
- **Animations**: Framer Motion 12
- **Routing**: React Router 7
- **Forms**: React Hook Form + Zod
- **HTTP**: Axios
- **Auth**: Firebase Client SDK v11
- **Database**: Firestore Client SDK

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express 4
- **Auth**: Firebase Admin SDK
- **AI**: Gemini API
- **Secrets**: Google Cloud Secret Manager
- **Database**: Firestore Admin SDK
- **Automation**: n8n webhooks
- **Security**: Helmet, CORS, rate limiting

### Infrastructure
- **Deployment**: Google Cloud Run
- **CI/CD**: Cloud Build
- **Container**: Docker + nginx
- **Secrets**: Secret Manager
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **Storage**: Google Drive (per-user)

---

*This architecture diagram provides a comprehensive overview of the DriveFlow system, including component relationships, data flows, security measures, and deployment infrastructure.*