"use strict";
// Recommendation Engine
// Generates personalized recommendations based on persona and signals
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRecommendations = generateRecommendations;
exports.storeRecommendations = storeRecommendations;
exports.getRecommendations = getRecommendations;
const assignPersona_1 = require("../personas/assignPersona");
const db_1 = require("../db/db");
const eligibility_1 = require("./eligibility");
const ranker_1 = require("./ranker");
const rationaleGenerator_1 = require("../ai/rationaleGenerator");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Load content catalog (prefer content-library.json, fallback to content.json for backward compatibility)
let contentCatalog;
const contentLibraryPath = path.join(__dirname, 'content-library.json');
const contentPath = path.join(__dirname, 'content.json');
if (fs.existsSync(contentLibraryPath)) {
    contentCatalog = JSON.parse(fs.readFileSync(contentLibraryPath, 'utf-8'));
}
else if (fs.existsSync(contentPath)) {
    contentCatalog = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
}
else {
    throw new Error('Content catalog not found. Please create content-library.json or content.json');
}
/**
 * Generate personalized rationale for a recommendation
 * Uses AI (GPT-4o-mini) if available, falls back to template-based rationale
 * @param userId - The user ID
 * @param recommendation - The recommendation content
 * @param signals - User's behavioral signals
 * @param accountInfo - Account information (for credit card recommendations)
 * @returns Personalized rationale string
 */
async function generateRationale(userId, recommendation, signals, accountInfo) {
    // Use AI rationale generator (with fallback to template)
    return await (0, rationaleGenerator_1.generateRationale)(userId, recommendation, signals, accountInfo);
}
/**
 * Get account information for rationale generation
 * @param userId - The user ID
 * @returns Account information (last 4 digits, type)
 */
async function getAccountInfo(userId) {
    const account = await (0, db_1.get)(`SELECT account_id, type FROM accounts 
     WHERE user_id = ? AND type = 'credit' 
     LIMIT 1`, [userId]);
    if (!account) {
        return {};
    }
    // Extract last 4 digits from account ID (simplified - in real system would use masked account number)
    const last4 = account.account_id.slice(-4);
    return {
        last4,
        accountType: account.type === 'credit' ? 'credit card' : account.type
    };
}
/**
 * Generate recommendations for a user
 * @param userId - The user ID
 * @returns Array of recommendations
 */
async function generateRecommendations(userId) {
    // Get user's current persona
    const persona = await (0, assignPersona_1.getCurrentPersona)(userId);
    if (!persona) {
        throw new Error('User has no assigned persona');
    }
    const personaType = persona.persona_type;
    const personaId = persona.persona_id;
    const signals = persona.signals;
    // Get persona-specific content from catalog
    const personaContent = contentCatalog[personaType];
    if (!personaContent) {
        throw new Error(`No content catalog found for persona: ${personaType}`);
    }
    // Get account info for rationale generation
    const accountInfo = await getAccountInfo(userId);
    const recommendations = [];
    // Generate education recommendations
    if (personaContent.education) {
        for (const eduItem of personaContent.education) {
            const rationale = await generateRationale(userId, eduItem, signals, accountInfo);
            recommendations.push({
                rec_id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                user_id: userId,
                persona_id: personaId,
                type: 'education',
                content: `${eduItem.title}: ${eduItem.description}`,
                rationale,
                created_at: new Date().toISOString()
            });
        }
    }
    // Generate partner offer recommendations (filter by eligibility)
    if (personaContent.partner_offers) {
        // Filter offers by eligibility
        const eligibleOffers = await (0, eligibility_1.filterEligibleOffers)(userId, personaContent.partner_offers);
        for (const offer of eligibleOffers) {
            const rationale = await generateRationale(userId, offer, signals, accountInfo);
            recommendations.push({
                rec_id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                user_id: userId,
                persona_id: personaId,
                type: 'partner_offer',
                content: `${offer.title}: ${offer.description}`,
                rationale,
                impact_estimate: offer.impact,
                created_at: new Date().toISOString()
            });
        }
    }
    return recommendations;
}
/**
 * Store recommendations in database
 * @param recommendations - Array of recommendations to store
 */
async function storeRecommendations(recommendations) {
    for (const rec of recommendations) {
        await (0, db_1.run)(`INSERT INTO recommendations (rec_id, user_id, persona_id, type, content, rationale, impact_estimate, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            rec.rec_id,
            rec.user_id,
            rec.persona_id,
            rec.type,
            rec.content,
            rec.rationale,
            rec.impact_estimate || null,
            rec.created_at
        ]);
    }
}
/**
 * Get recommendations for a user
 * Deduplicates recommendations by content title, then ranks by priority
 * @param userId - The user ID
 * @param limit - Maximum number of recommendations to return (default: 5)
 * @returns Array of unique, ranked recommendations
 */
async function getRecommendations(userId, limit = 5) {
    const rows = await (0, db_1.all)(`SELECT rec_id, user_id, persona_id, type, content, rationale, impact_estimate, created_at
     FROM recommendations
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`, [userId, limit * 3] // Get more to account for deduplication and ranking
    );
    // Deduplicate by content title (extract title from content string)
    const seen = new Set();
    const unique = [];
    for (const rec of rows) {
        // Extract title from content (format: "Title: Description")
        const title = rec.content.split(':')[0].trim();
        // Create a unique key based on type and title
        const key = `${rec.type}:${title}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(rec);
        }
    }
    // Rank recommendations by impact and urgency
    const ranked = await (0, ranker_1.rankRecommendations)(userId, unique, limit);
    return ranked;
}
