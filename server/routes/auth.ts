import { Router } from 'express';
import { authenticateFirebaseUser } from '../middleware/auth.js';
import { getEmailVerificationStatus, sendVerificationEmail, isEmailVerified } from '../services/emailVerification.js';
import { getAdminAuth } from '../services/firebaseAdmin.js';

const router = Router();

/**
 * POST /api/auth/verify
 *
 * Verifies a Firebase ID token. Returns the authenticated user + verified email
 * status. This contract is preserved: the frontend calls this with a token.
 */
router.post('/verify', authenticateFirebaseUser, (req, res) => {
  res.json({
    authenticated: true,
    uid: req.user!.uid,
    email: req.user!.email,
    emailVerified: req.user!.emailVerified,
    displayName: req.user!.displayName,
  });
});

/**
 * POST /api/auth/email/send-verification
 *
 * Sends a Firebase email verification link to the authenticated user (for
 * email/password accounts only). Google users are already verified.
 */
router.post('/email/send-verification', authenticateFirebaseUser, async (req, res) => {
  try {
    const uid = req.user!.uid;
    const status = await getEmailVerificationStatus(uid);

    if (status.provider === 'google.com') {
      res.json({ sent: false, message: 'Google accounts do not require email verification.' });
      return;
    }

    if (status.emailVerified) {
      res.json({ sent: false, alreadyVerified: true, message: 'Email is already verified.' });
      return;
    }

    const actionCodeSettings = typeof req.body?.url === 'string' ? { url: req.body.url } : undefined;
    const link = await sendVerificationEmail(uid, actionCodeSettings);

    if (link === null) {
      res.json({ sent: false, alreadyVerified: true, message: 'Email is already verified.' });
      return;
    }

    res.json({ sent: true, message: 'Verification email sent. Check your inbox.', verificationLink: link });
  } catch (error) {
    console.error(`[auth] send-verification error:`, error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Unable to send verification email.' });
  }
});

/**
 * POST /api/auth/email/resend-verification
 *
 * Alias for repeated verification email requests.
 */
router.post('/email/resend-verification', authenticateFirebaseUser, async (req, res) => {
  try {
    const uid = req.user!.uid;
    const status = await getEmailVerificationStatus(uid);

    if (status.provider === 'google.com') {
      res.json({ sent: false, message: 'Google accounts do not require email verification.' });
      return;
    }

    if (status.emailVerified) {
      res.json({ sent: false, alreadyVerified: true, message: 'Email is already verified.' });
      return;
    }

    const link = await sendVerificationEmail(uid);
    if (link === null) {
      res.json({ sent: false, alreadyVerified: true, message: 'Email is already verified.' });
      return;
    }
    res.json({ sent: true, message: 'Verification email re-sent. Check your inbox.', verificationLink: link });
  } catch (error) {
    console.error(`[auth] resend-verification error:`, error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Unable to re-send verification email.' });
  }
});

/**
 * POST /api/auth/email/status
 *
 * Returns the authoritative email verification status fetched from Firebase
 * Admin. Used after login/registration and after clicking verification links.
 */
router.post('/email/status', authenticateFirebaseUser, async (req, res) => {
  try {
    const uid = req.user!.uid;
    const status = await getEmailVerificationStatus(uid);
    res.json(status);
  } catch (error) {
    console.error(`[auth] email status error:`, error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Unable to check email verification status.' });
  }
});

/**
 * POST /api/auth/user-verified
 *
 * Convenience endpoint: returns boolean verified state.
 */
router.post('/user-verified', authenticateFirebaseUser, async (req, res) => {
  try {
    const uid = req.user!.uid;
    const verified = await isEmailVerified(uid);
    res.json({ emailVerified: verified });
  } catch (error) {
    console.error(`[auth] user-verified error:`, error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Unable to check verification status.' });
  }
});

/**
 * POST /api/auth/refresh-email
 *
 * Forces a re-fetch of the user's email from Firebase (after verification).
 */
router.post('/refresh-email', authenticateFirebaseUser, async (req, res) => {
  try {
    const auth = getAdminAuth();
    const userRecord = await auth.getUser(req.user!.uid);
    res.json({
      email: userRecord.email,
      emailVerified: userRecord.providerData[0]?.providerId === 'google.com'
        ? true
        : Boolean(userRecord.emailVerified),
      displayName: userRecord.displayName,
    });
  } catch (error) {
    console.error(`[auth] refresh-email error:`, error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Unable to refresh user email info.' });
  }
});

export default router;
