"use strict";
// Chat Response Cache Module
// Provides caching for AI chat responses to reduce API costs
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
exports.normalizeQuery = normalizeQuery;
exports.generateCacheKey = generateCacheKey;
exports.getCachedResponse = getCachedResponse;
exports.cacheResponse = cacheResponse;
exports.getCacheStats = getCacheStats;
exports.clearExpiredCache = clearExpiredCache;
exports.clearUserCache = clearUserCache;
exports.logCacheOperation = logCacheOperation;
const db_1 = require("../db/db");
const crypto = __importStar(require("crypto"));
// In-memory cache statistics (per user, reset on server restart)
const cacheStats = new Map();
/**
 * Normalize a query string for caching
 * - Convert to lowercase
 * - Remove punctuation
 * - Trim whitespace
 * - Basic normalization (MVP level)
 */
function normalizeQuery(query) {
    return query
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}
/**
 * Generate a cache key from user ID and normalized query
 */
function generateCacheKey(userId, normalizedQuery) {
    const data = `${userId}:${normalizedQuery}`;
    return crypto.createHash('sha256').update(data).digest('hex');
}
/**
 * Get cached response if available
 * @param cacheKey - The cache key (hash of user_id + normalized_query)
 * @returns Cached response or null if not found/expired
 */
async function getCachedResponse(cacheKey) {
    try {
        const cached = await (0, db_1.get)(`SELECT response, expires_at FROM chat_cache 
       WHERE query_hash = ? AND expires_at > datetime('now')`, [cacheKey]);
        if (cached) {
            // Log cache hit
            logCacheHit(cacheKey);
            return cached.response;
        }
    }
    catch (error) {
        console.error('Error fetching cached response:', error);
    }
    // Log cache miss
    logCacheMiss(cacheKey);
    return null;
}
/**
 * Cache a response for future use
 * @param cacheKey - The cache key (hash of user_id + normalized_query)
 * @param userId - The user ID
 * @param response - The response to cache
 * @param ttlHours - Time to live in hours (default: 1 hour for chat responses)
 */
async function cacheResponse(cacheKey, userId, response, ttlHours = 1) {
    try {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + ttlHours);
        // Generate cache_id
        const cacheId = `cache-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await (0, db_1.run)(`INSERT OR REPLACE INTO chat_cache (cache_id, query_hash, user_id, response, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`, [cacheId, cacheKey, userId, response, expiresAt.toISOString()]);
    }
    catch (error) {
        console.error('Error caching response:', error);
        // Don't throw - caching is optional
    }
}
/**
 * Log cache hit for statistics
 */
function logCacheHit(cacheKey) {
    const userId = extractUserIdFromCacheKey(cacheKey);
    if (!userId)
        return;
    const stats = cacheStats.get(userId) || { hits: 0, misses: 0, totalQueries: 0, hitRate: 0 };
    stats.hits++;
    stats.totalQueries++;
    stats.hitRate = stats.hits / stats.totalQueries;
    cacheStats.set(userId, stats);
    console.log(`[CACHE HIT] User: ${userId}, Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
}
/**
 * Log cache miss for statistics
 */
function logCacheMiss(cacheKey) {
    const userId = extractUserIdFromCacheKey(cacheKey);
    if (!userId)
        return;
    const stats = cacheStats.get(userId) || { hits: 0, misses: 0, totalQueries: 0, hitRate: 0 };
    stats.misses++;
    stats.totalQueries++;
    stats.hitRate = stats.hits / stats.totalQueries;
    cacheStats.set(userId, stats);
    console.log(`[CACHE MISS] User: ${userId}, Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
}
/**
 * Extract user ID from cache key (for logging purposes)
 * Note: This is a best-effort extraction since cache keys are hashes
 * In practice, we pass userId separately, but this helps with logging
 */
function extractUserIdFromCacheKey(cacheKey) {
    // Cache keys are hashes, so we can't extract userId directly
    // This is just for logging - we'll use a different approach
    return null;
}
/**
 * Get cache statistics for a user
 */
function getCacheStats(userId) {
    return cacheStats.get(userId) || { hits: 0, misses: 0, totalQueries: 0, hitRate: 0 };
}
/**
 * Clear expired cache entries (cleanup function)
 * Should be called periodically (e.g., daily)
 */
async function clearExpiredCache() {
    try {
        const result = await (0, db_1.run)(`DELETE FROM chat_cache WHERE expires_at < datetime('now')`);
        return result.changes || 0;
    }
    catch (error) {
        console.error('Error clearing expired cache:', error);
        return 0;
    }
}
/**
 * Clear all cache entries for a user
 */
async function clearUserCache(userId) {
    try {
        await (0, db_1.run)(`DELETE FROM chat_cache WHERE user_id = ?`, [userId]);
        // Clear stats
        cacheStats.delete(userId);
    }
    catch (error) {
        console.error('Error clearing user cache:', error);
    }
}
/**
 * Enhanced cache hit/miss logging with user ID
 */
function logCacheOperation(userId, hit) {
    const stats = cacheStats.get(userId) || { hits: 0, misses: 0, totalQueries: 0, hitRate: 0 };
    if (hit) {
        stats.hits++;
    }
    else {
        stats.misses++;
    }
    stats.totalQueries++;
    stats.hitRate = stats.hits / stats.totalQueries;
    cacheStats.set(userId, stats);
    const operation = hit ? 'HIT' : 'MISS';
    console.log(`[CACHE ${operation}] User: ${userId}, Hit rate: ${(stats.hitRate * 100).toFixed(1)}% (${stats.hits}/${stats.totalQueries})`);
}
