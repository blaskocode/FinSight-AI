// Consent Middleware
// Ensures user has active consent before accessing protected routes

import { Request, Response, NextFunction } from 'express';
import { checkConsent } from '../guardrails/consent';

/**
 * Middleware to require active consent
 * Returns 403 if user does not have active consent
 */
export async function requireConsent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.params.user_id;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    // Check if user has active consent
    const hasConsent = await checkConsent(userId);

    if (!hasConsent) {
      res.status(403).json({
        error: 'Consent required',
        message: 'You must provide consent before accessing this resource. Please visit /api/consent to provide consent.'
      });
      return;
    }

    // User has consent, proceed to next middleware
    next();
  } catch (error: any) {
    console.error('Error checking consent:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

