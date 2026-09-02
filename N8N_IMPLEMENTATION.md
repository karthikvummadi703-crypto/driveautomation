# DriveFlow → n8n workflow implementation spec

> **DEPRECATED (kept for reference).** DriveFlow no longer routes uploads through an n8n
> webhook. Since the per-user Drive refactor, the browser uploads files **directly to each
> signed-in user's own Google Drive** using their OAuth token (`drive.file` scope) — see
> `src/services/uploadService.ts` and the README. The workflow below was the old
> single-shared-Drive design, which silently reported success even when a non-Google email
> had no Drive to receive the file.

This is the exact set of changes to apply to the **"CloudDrive Upload"** workflow
(production webhook `https://jntua-cea1.app.n8n.cloud/webhook/upload-file`) so the
workflow matches the DriveFlow app after the decisions below:

- **Auth:** `X-Api-Key` header **+** Firebase ID token verification
- **Sharing:** per-user share to the uploader's email (role: reader)
- **Max file size:** 16 MB (app and webhook enforce the same limit)

> Apply these in the n8n editor (nodes are listed in order). You can hand this file to
> an n8n AI assistant to do the edits. The app side is already updated.

---

## Node 1 — Webhook (edit)

Open the **Webhook** node → **Add Option → Authentication → Header Auth**.
Create a **Header Auth** credential:

| Setting | Value |
| --- | --- |
| Credential name | `DriveFlow Webhook Secret` |
| Name | `X-Api-Key` |
| Value | a long random string (32+ chars, e.g. from `openssl rand -base64 32`) |

n8n now automatically returns **403** for any request without the matching header —
no extra node needed. **Keep** `responseMode: responseNode`, `binaryData: true`.

> The value must match `VITE_N8N_WEBHOOK_SECRET` in the app's build env (`.env.local`,
> Docker build arg, Cloud Build substitution).

---

## Node 2 — Validate Request (new Code node)

Delete the old **"File Present?"** and **"Respond No File"** nodes. Add a **Code** node
named `Validate Request` (mode: Run Once for Each Item). Connect Webhook → Validate
Request.

```js
// Validate Request
const MAX_BYTES = 16 * 1024 * 1024; // must match DriveFlow MAX_FILE_SIZE_BYTES
const ALLOWED = [
  'image/', 'video/', 'audio/', 'text/', 'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument', // docx / xlsx / pptx
  'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed',
  'application/x-7z-compressed', 'application/gzip', 'application/x-tar',
  'application/json', 'application/xml',
];

const bin = $binary?.file;
const body = $json.body ?? $json;

if (!bin) throw new NodeOperationError($node, 'No file received.');
if (!body.userId || !body.email || !body.idToken) {
  throw new NodeOperationError($node, 'Missing userId, email or idToken.');
}

const size = bin.fileSize ? Number(bin.fileSize) : Buffer.from(bin.data, 'base64').length;
if (!size || size === 0) throw new NodeOperationError($node, 'The file is empty.');

if (size > MAX_BYTES) {
  throw new NodeOperationError($node, 'File exceeds the 16 MB limit.');
}

const mime = bin.mimeType || '';
if (!ALLOWED.some((p) => mime.startsWith(p))) {
  throw new NodeOperationError($node, 'This file type is not supported.');
}

return $input.item;
```

- Node settings: **On Error → Continue (use error output)**.
- `[main]` output → Node 3. `[error]` output → Respond Rejected (Node 7).

---

## Node 3 — Verify Firebase Token (new Code node)

Code node named `Verify Firebase Token` (Run Once for Each Item). This verifies the
ID token with Google's tokeninfo endpoint, then passes the original payload
(including the binary file) through unchanged.

```js
// Verify Firebase Token
const body = $json.body ?? $json;
const idToken = body.idToken;

if (!idToken) throw new NodeOperationError($node, 'Missing idToken.');

const claims = await this.helpers.httpRequest({
  method: 'GET',
  url: `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  timeout: 10000,
});

const now = Math.floor(Date.now() / 1000);
const expectedIssuer = 'https://securetoken.google.com/n8nsampleproject-ff2c5';

if (!claims || claims.user_id !== body.userId || claims.email !== body.email) {
  throw new NodeOperationError($node, 'Uploader identity does not match the ID token.');
}
if (claims.iss !== expectedIssuer) {
  throw new NodeOperationError($node, 'ID token was not issued for this Firebase project.');
}
if (!claims.exp || claims.exp < now) {
  throw new NodeOperationError($node, 'ID token has expired. Please sign in again.');
}

return $input.item; // keeps $json (with body) and $binary.file for the next node
```

> **Security note:** `tokeninfo` verifies the token was issued by Google and is not
> expired. The `iss` + `user_id` + `email` checks tie it to your Firebase project and
> to the `userId`/`email` the app sent. For stricter production verification, verify
> the JWT signature against Firebase public keys (or use the Firebase Admin SDK) and
> additionally check `claims.aud` against your project's web client ID.

- Node settings: **On Error → Continue (use error output)**.
- `[main]` output → Node 4. `[error]` output → Respond Auth Failed (Node 8).

---

## Node 4 — Upload to Google Drive (edit)

In the existing **"Upload to Google Drive"** node:

- **Options → simplifyOutput: remove it / set to `false`** — this restores the full
  Drive file resource so `webViewLink` (used for `driveLink`) is actually present.
  (This is the fix for the empty `driveLink` you were seeing.)
- Node settings: **Retry On Fail → 2 attempts, 5s wait** to absorb transient Google
  5xx / rate-limit errors. Keep `On Error → Continue (use error output)`.

- `[main]` output → Node 5. `[error]` output → Respond Upload Error (Node 9).

---

## Node 5 — Share with Uploader (new Google Drive node)

Google Drive node: **Resource: File → Operation: Share**.

| Setting | Value |
| --- | --- |
| File (fileId) | `={{ $json.id }}` |
| Role | `reader` |
| Type | `user` |
| Email Address | `={{ $('Verify Firebase Token').first().json.body.email }}` |

- Node settings: **On Error → Continue (use error output)**.
- Connect **both** `[main]` and `[error]` outputs → Respond Success (Node 6).
  A failed share (e.g. the uploader's email is not a Google account) must not fail the
  upload or cause a duplicate on retry; the file stays private to the Drive account in
  that case.

---

## Node 6 — Respond Success (edit)

Change the response body to read from the **Upload to Google Drive** node directly, so
it works even on the share-error path. Full contract, HTTP 200:

```
={{ { success: true, message: 'File uploaded successfully', fileName: $('Upload to Google Drive').first().json.name ?? '', driveLink: $('Upload to Google Drive').first().json.webViewLink ?? '', uploadedAt: $now.toISO() } }}
```

---

## Node 7 — Respond Rejected (new Respond node)

HTTP **400**, body (always includes every field the app's `UploadResponse` expects):

```
={{ { success: false, message: 'Request rejected', error: $json.error?.message ?? 'Invalid request.', fileName: '', driveLink: '', uploadedAt: '' } }}
```

Wired from `Validate Request` `[error]`.

---

## Node 8 — Respond Auth Failed (new Respond node)

HTTP **401**, body:

```
={{ { success: false, message: 'Authentication failed', error: $json.error?.message ?? 'Unauthorized.', fileName: '', driveLink: '', uploadedAt: '' } }}
```

Wired from `Verify Firebase Token` `[error]`.

---

## Node 9 — Respond Upload Error (edit)

HTTP **500**. Surface the real Drive error, and fill the full contract:

```
={{ { success: false, message: 'File upload failed', error: $('Upload to Google Drive').first().json.error?.message ?? 'The file could not be uploaded to Google Drive.', fileName: '', driveLink: '', uploadedAt: '' } }}
```

Wired from `Upload to Google Drive` `[error]`.

---

## Final connections

```
Webhook ──► Validate Request ──► Verify Firebase Token ──► Upload to Google Drive ──► Share with Uploader ──► Respond Success
               │   [error]                      │   [error]                 │   [error]                │   [error] ─┘
               ▼                               ▼                           ▼
          Respond Rejected (400)      Respond Auth Failed (401)    Respond Upload Error (500)
```

## Contract after implementation

**Success — HTTP 200**
```json
{ "success": true, "message": "File uploaded successfully", "fileName": "<name>", "driveLink": "<webViewLink>", "uploadedAt": "<iso>" }
```

**Failure — HTTP 4xx/5xx (all fields present)**
```json
{ "success": false, "message": "<short reason>", "error": "<human-readable reason>", "fileName": "", "driveLink": "", "uploadedAt": "" }
```

**Pre-workflow rejections** (wrong/missing `X-Api-Key`): n8n returns 403 with a plain
body; the app surfaces it via `getErrorMessage`.

## Reminders

1. After editing, **activate** the workflow and test with the **production URL** (not
   the `.../test/` URL).
2. The app must send `VITE_N8N_WEBHOOK_SECRET` matching Node 1's credential — otherwise
   every upload gets a 403.
3. **n8n Cloud payload cap:** the app now caps files at 16 MB to match the default
   platform limit. If you ever raise `N8N_PAYLOAD_SIZE_MAX`, raise
   `MAX_FILE_SIZE_BYTES` in `src/config/constants.ts` and the `MAX_BYTES` constant
   above together.
4. **Per-user share requires a Google account email.** Users who registered with an
   email/password address that isn't a Google account will still upload successfully,
   but their file will stay private (share error is swallowed). Most DriveFlow users
   sign in with Google, so this is the common path.
