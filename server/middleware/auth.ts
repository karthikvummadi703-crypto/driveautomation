import type { Request, Response, NextFunction } from 'express';
import { getAdminAuth } from '../services/firebaseAdmin.js';

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  provider: 'google.com' | 'password' | 'unknown';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Central authentication middleware.
 *
 * The Firebase ID token in the Authorization header is verified via the
 * Firebase Admin SDK. The verified `uid`, `email`, and `emailVerified` fields
 * from the token are the ONLY identity source. Never trust uid/email from the
 * request body, query string, or any client-supplied value.
 */
export async function authenticateFirebaseUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const idToken = authHeader.slice(7);

  if (!idToken || idToken.trim().length === 0) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);

    const providerId = decodedToken.firebase?.sign_in_provider ?? 'unknown';

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
      // email_verified is authoritative from the Firebase Admin token.
      // Google-authenticated users are handled separately via provider check.
      emailVerified: decodedToken.email_verified ?? false,
      displayName: decodedToken.name ?? null,
      provider: providerId === 'google.com' ? 'google.com' : 'password',
    };

    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[auth] Token verification failed: ${message}`);
    res.status(401).json({ error: 'Unauthorized' });
  }
}

/**
 * Optional middleware: enforces email verification for password-provider users.
 * Google-authenticated users are always allowed through (Google vets the account).
 *
 * If the ID token claims the email is unverified, it re-fetches the authoritative
 * status from Firebase Admin (ID tokens can be stale for up to ~1h), so a user
 * who just clicked the verification link is recognized without waiting.
 *
 * Usage: apply AFTER authenticateFirebaseUser on protected routes that should
 * require verified email.
 */
export async function requireVerifiedEmail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (user.provider === 'google.com' || user.emailVerified) {
    next();
    return;
  }

  // The ID token says unverified (or provider is password). Re-fetch the
  // authoritative emailVerified from Firebase Admin before blocking.
  try {
    const auth = getAdminAuth();
    const userRecord = await auth.getUser(user.uid);
    const isGoogle = userRecord.providerData[0]?.providerId === 'google.com';
    const verified = isGoogle || Boolean(userRecord.emailVerified);
    if (verified) {
      user.emailVerified = true;
      user.provider = isGoogle ? 'google.com' : 'password';
      next();
      return;
    }
  } catch {
    // If we can't reach Firebase Admin, fall through to blocking.
  }

  res.status(403).json({
    error: 'Please verify your email address before continuing.',
    code: 'EMAIL_NOT_VERIFIED',
  });
}
