/**
 * Webhook Signature Verification Utilities
 * Provides secure signature verification for payment webhooks
 */

import crypto from 'crypto';

interface VerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Verify webhook signature from SePay
 */
export function verifySepaySignature(
  payload: string,
  signature: string,
  secret: string
): VerificationResult {
  if (!signature) {
    return { valid: false, error: 'Missing signature' };
  }

  if (!secret) {
    return { valid: false, error: 'Webhook secret not configured' };
  }

  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const valid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );

    return { valid, error: valid ? undefined : 'Invalid signature' };
  } catch (error) {
    return { valid: false, error: 'Signature verification failed' };
  }
}

/**
 * Verify Stripe webhook signature
 */
export function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): VerificationResult {
  // Stripe uses a specific format: t=timestamp,v1=signature
  const elements = signature.split(',');
  const timestamp = elements.find(e => e.startsWith('t='))?.slice(2);
  const sig = elements.find(e => e.startsWith('v1='))?.slice(3);

  if (!timestamp || !sig) {
    return { valid: false, error: 'Invalid signature format' };
  }

  // Check timestamp (5 minute tolerance)
  const tolerance = 5 * 60;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > tolerance) {
    return { valid: false, error: 'Signature timestamp expired' };
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  const valid = crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expected)
  );

  return { valid, error: valid ? undefined : 'Invalid signature' };
}
