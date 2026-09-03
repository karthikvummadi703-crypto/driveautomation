import { createHmac, timingSafeEqual } from 'node:crypto';

const STATE_TTL_MS = 10 * 60 * 1000;

function stateSecret(): string {
  return process.env.OAUTH_STATE_SECRET || 'driveflow-oauth-state-secret';
}

/**
 * Generates a tamper-proof OAuth `state` value that binds the Drive OAuth
 * consent flow to the requesting user's uid. The callback later verifies this
 * signature so a malicious third party cannot forge a state that would cause
 * tokens to be written into another user's record.
 *
 * The optional `issuedAt` is primarily for testing expiry behavior.
 */
export function generateOAuthState(uid: string, issuedAt: number = Date.now()): string {
  const payload = `${uid}.${issuedAt}`;
  const signature = createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

/**
 * Verifies an OAuth `state` value and returns the bound uid, or null if the
 * value is invalid, expired, or the signature does not match.
 */
export function verifyOAuthState(state: string): string | null {
  if (typeof state !== 'string') return null;
  const parts = state.split('.');
  if (parts.length !== 3) return null;

  const [uid, issuedAtStr, signature] = parts;
  const payload = `${uid}.${issuedAtStr}`;

  if (!uid || !issuedAtStr || !signature) return null;

  const expected = createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== providedBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, providedBuffer)) return null;

  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > STATE_TTL_MS) return null;

  return uid;
}
