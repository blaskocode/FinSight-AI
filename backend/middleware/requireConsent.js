"use strict";
// Consent Middleware
// Ensures user has active consent before accessing protected routes
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireConsent = requireConsent;
const consent_1 = require("../guardrails/consent");
/**
 * Middleware to require active consent
 * Returns 403 if user does not have active consent
 */
async function requireConsent(req, res, next) {
    try {
        const userId = req.params.user_id;
        if (!userId) {
            res.status(400).json({ error: 'User ID is required' });
            return;
        }
        // Check if user has active consent
        const hasConsent = await (0, consent_1.checkConsent)(userId);
        if (!hasConsent) {
            res.status(403).json({
                error: 'Consent required',
                message: 'You must provide consent before accessing this resource. Please visit /api/consent to provide consent.'
            });
            return;
        }
        // User has consent, proceed to next middleware
        next();
    }
    catch (error) {
        console.error('Error checking consent:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
