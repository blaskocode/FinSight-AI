"use strict";
// Username Utility
// Converts full names to usernames: "John Doe" -> "john.doe"
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
exports.generateUsername = generateUsername;
exports.findUserByUsername = findUserByUsername;
/**
 * Convert full name to username format
 * Format: firstname.lastname (lowercase, spaces replaced with periods)
 *
 * @param name - Full name (e.g., "John Doe", "Mary Jane Smith")
 * @returns Username (e.g., "john.doe", "mary.jane.smith")
 *
 * Examples:
 * - "John Doe" -> "john.doe"
 * - "Mary Jane Smith" -> "mary.jane.smith"
 * - "Bob" -> "bob"
 * - "  John   Doe  " -> "john.doe" (trims whitespace)
 */
function generateUsername(name) {
    if (!name || typeof name !== 'string') {
        return '';
    }
    // Trim whitespace and normalize spaces
    const normalized = name.trim().replace(/\s+/g, ' ');
    // Convert to lowercase and replace spaces with periods
    const username = normalized.toLowerCase().replace(/\s/g, '.');
    return username;
}
/**
 * Find user by username
 * Looks up user in database by converting their name to username format
 *
 * @param username - Username to search for (e.g., "john.doe")
 * @returns User object with user_id and name, or null if not found
 */
async function findUserByUsername(username) {
    if (!username || typeof username !== 'string') {
        return null;
    }
    const { all } = await Promise.resolve().then(() => __importStar(require('../db/db')));
    // Find user by matching username format
    // We need to convert stored names to username format for comparison
    // SQLite doesn't have great string manipulation, so we'll fetch all users and filter
    // For better performance, we could add a username column to the users table
    const users = await all(`SELECT user_id, name, email FROM users`);
    if (!users || !Array.isArray(users)) {
        return null;
    }
    // Find user whose name converts to the requested username
    const user = users.find(u => generateUsername(u.name) === username.toLowerCase());
    return user || null;
}
