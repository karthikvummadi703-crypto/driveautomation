import { getAdminAuth } from './firebaseAdmin.js';

/**
 * Sanitized email-verification status for API responses.
 * Never trusts client-side booleans — always verified server-side via Firebase Admin.
 */
export interface EmailVerificationStatus {
  emailVerified: boolean;
  provider: 'google.com' | 'password' | 'unknown';
}

/**
 * Determine email verification status and auth provider for a Firebase UID.
 * Google-authenticated users are considered verified (Google vets the account).
 */
export async function getEmailVerificationStatus(uid: string): Promise<EmailVerificationStatus> {
  const auth = getAdminAuth();
  const userRecord = await auth.getUser(uid);

  const providerId = userRecord.providerData[0]?.providerId ?? 'unknown';
  const emailVerified =
    providerId === 'google.com' ? true : Boolean(userRecord.emailVerified);

  return {
    emailVerified,
    provider: providerId === 'google.com' ? 'google.com' : 'password',
  };
}

/**
 * Generate a Firebase email verification link for the user. The returned URL
 * is a Firebase auth action URL. To actually SEND the email, the client SDK
 * should call `user.sendEmailVerification()` (Firebase native) — there is no
 * Admin SDK method to send an email on the user's behalf. The backend provides
 * this link for the frontend to display or redirect the user to, and the
 * /email/send-verification route can be called by the frontend after
 * registration if the client did not auto-send.
 *
 * Returns the generated verification link, or null if the user is already
 * verified (no link needed) or email is missing.
 */
export async function sendVerificationEmail(
  uid: string,
  actionCodeSettings?: {
    url?: string;
    handleCodeInApp?: boolean;
  },
): Promise<string | null> {
  const auth = getAdminAuth();
  const userRecord = await auth.getUser(uid);

  if (userRecord.emailVerified || !userRecord.email) {
    return null;
  }

  const defaultUrl = process.env.APP_BASE_URL || process.env.VITE_API_BASE_URL || 'http://localhost:3000';

  const link = await auth.generateEmailVerificationLink(userRecord.email, {
    url: actionCodeSettings?.url ?? defaultUrl,
    handleCodeInApp: actionCodeSettings?.handleCodeInApp ?? true,
  });

  return link;
}

/**
 * Re-fetch the authoritative emailVerified status for a user. Used after a
 * user clicks a verification link to confirm they are now verified.
 */
export async function isEmailVerified(uid: string): Promise<boolean> {
  const { emailVerified } = await getEmailVerificationStatus(uid);
  return emailVerified;
}

/**
 * Middleware: require email verification for password-provider users unless they
 * are Google-authenticated (which are inherently verified) or explicitly excluded.
 */
export async function requireVerifiedEmail(
  uid: string,
  opts: { allowUnverified?: boolean } = {},
): Promise<{ allowed: boolean; reason?: string }> {
  if (opts.allowUnverified) return { allowed: true };

  const status = await getEmailVerificationStatus(uid);
  if (status.provider === 'google.com' || status.emailVerified) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Please verify your email address before continuing.',
  };
}
