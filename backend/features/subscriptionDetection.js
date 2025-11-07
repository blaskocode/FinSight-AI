"use strict";
// Subscription Detection Feature
// Detects recurring subscriptions and recurring payments
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRecurringMerchants = findRecurringMerchants;
exports.calculateRecurringCadence = calculateRecurringCadence;
exports.calculateMonthlyRecurringSpend = calculateMonthlyRecurringSpend;
exports.calculateSubscriptionShare = calculateSubscriptionShare;
exports.getSubscriptionAnalysis = getSubscriptionAnalysis;
const db_1 = require("../db/db");
/**
 * Find recurring merchants (merchants with ≥3 occurrences)
 * @param userId - The user ID
 * @param windowDays - Analysis window in days (default: 90)
 * @returns Array of recurring merchants
 */
async function findRecurringMerchants(userId, windowDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    // Get all transactions for user's accounts in the window
    const transactions = await (0, db_1.all)(`SELECT t.transaction_id, t.date, t.amount, t.merchant_name
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.account_id
     WHERE a.user_id = ? 
       AND t.date >= ?
       AND t.merchant_name IS NOT NULL
       AND t.merchant_name != ''
       AND t.amount < 0
     ORDER BY t.merchant_name, t.date`, [userId, cutoffDateStr]);
    // Group transactions by merchant
    const merchantGroups = new Map();
    for (const tx of transactions) {
        const merchant = tx.merchant_name.toLowerCase().trim();
        if (!merchantGroups.has(merchant)) {
            merchantGroups.set(merchant, []);
        }
        merchantGroups.get(merchant).push(tx);
    }
    const recurringMerchants = [];
    // Analyze each merchant group
    for (const [merchantName, txs] of merchantGroups.entries()) {
        if (txs.length < 3) {
            continue; // Need at least 3 occurrences
        }
        // Calculate amounts (convert to positive since they're negative in DB)
        const amounts = txs.map(tx => Math.abs(tx.amount));
        const totalAmount = amounts.reduce((sum, amt) => sum + amt, 0);
        const averageAmount = totalAmount / amounts.length;
        // Calculate intervals between transactions
        const sortedTxs = [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const intervals = [];
        for (let i = 1; i < sortedTxs.length; i++) {
            const daysDiff = Math.round((new Date(sortedTxs[i].date).getTime() - new Date(sortedTxs[i - 1].date).getTime()) /
                (1000 * 60 * 60 * 24));
            intervals.push(daysDiff);
        }
        // Determine cadence
        const cadence = calculateRecurringCadence(intervals, amounts);
        // Check if amounts are similar (±10% variance)
        const amountVariance = checkAmountVariance(amounts);
        // Only include if amounts are similar (subscription-like)
        if (amountVariance <= 0.1) {
            recurringMerchants.push({
                merchant_name: txs[0].merchant_name, // Use original case
                count: txs.length,
                total_amount: totalAmount,
                average_amount: averageAmount,
                first_date: sortedTxs[0].date,
                last_date: sortedTxs[sortedTxs.length - 1].date,
                cadence,
                intervals
            });
        }
    }
    return recurringMerchants;
}
/**
 * Calculate recurring cadence from transaction intervals
 * @param intervals - Array of days between transactions
 * @param amounts - Array of transaction amounts
 * @returns 'weekly', 'monthly', or 'irregular'
 */
function calculateRecurringCadence(intervals, amounts) {
    if (intervals.length === 0) {
        return 'irregular';
    }
    // Calculate average interval
    const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
    // Check for weekly pattern (6-8 days)
    const weeklyCount = intervals.filter(int => int >= 6 && int <= 8).length;
    const weeklyRatio = weeklyCount / intervals.length;
    // Check for monthly pattern (28-31 days)
    const monthlyCount = intervals.filter(int => int >= 28 && int <= 31).length;
    const monthlyRatio = monthlyCount / intervals.length;
    // Check for bi-weekly pattern (13-15 days)
    const biweeklyCount = intervals.filter(int => int >= 13 && int <= 15).length;
    const biweeklyRatio = biweeklyCount / intervals.length;
    // Determine cadence based on pattern
    if (weeklyRatio >= 0.6 || (avgInterval >= 6 && avgInterval <= 8)) {
        return 'weekly';
    }
    else if (monthlyRatio >= 0.6 || (avgInterval >= 28 && avgInterval <= 31)) {
        return 'monthly';
    }
    else if (biweeklyRatio >= 0.6) {
        return 'monthly'; // Treat bi-weekly as monthly for subscription purposes
    }
    else {
        return 'irregular';
    }
}
/**
 * Check if amounts have low variance (within ±10%)
 * @param amounts - Array of transaction amounts
 * @returns Variance ratio (0 = identical, 1 = 100% variance)
 */
function checkAmountVariance(amounts) {
    if (amounts.length === 0)
        return 1;
    const avg = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    if (avg === 0)
        return 1;
    // Calculate coefficient of variation
    const variance = amounts.reduce((sum, amt) => {
        const diff = amt - avg;
        return sum + (diff * diff);
    }, 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avg;
    return coefficientOfVariation;
}
/**
 * Calculate monthly recurring spend
 * @param userId - The user ID
 * @param windowDays - Analysis window in days (default: 90)
 * @returns Monthly recurring spend amount
 */
async function calculateMonthlyRecurringSpend(userId, windowDays = 90) {
    const recurringMerchants = await findRecurringMerchants(userId, windowDays);
    let monthlySpend = 0;
    for (const merchant of recurringMerchants) {
        if (merchant.cadence === 'monthly') {
            monthlySpend += merchant.average_amount;
        }
        else if (merchant.cadence === 'weekly') {
            // Convert weekly to monthly (4.33 weeks per month)
            monthlySpend += merchant.average_amount * 4.33;
        }
        // Ignore irregular cadence for monthly calculation
    }
    return Math.round(monthlySpend * 100) / 100; // Round to 2 decimal places
}
/**
 * Calculate subscription share as percentage of total spend
 * @param userId - The user ID
 * @param windowDays - Analysis window in days (default: 90)
 * @returns Subscription share percentage (0-100)
 */
async function calculateSubscriptionShare(userId, windowDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    // Get total spend (all negative amounts)
    const totalSpendResult = await (0, db_1.all)(`SELECT ABS(SUM(t.amount)) as total
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.account_id
     WHERE a.user_id = ? 
       AND t.date >= ?
       AND t.amount < 0`, [userId, cutoffDateStr]);
    const totalSpend = totalSpendResult[0]?.total || 0;
    if (totalSpend === 0) {
        return 0;
    }
    // Calculate recurring spend
    const recurringMerchants = await findRecurringMerchants(userId, windowDays);
    const recurringSpend = recurringMerchants.reduce((sum, m) => sum + m.total_amount, 0);
    const subscriptionShare = (recurringSpend / totalSpend) * 100;
    return Math.round(subscriptionShare * 100) / 100; // Round to 2 decimal places
}
/**
 * Get complete subscription analysis
 * @param userId - The user ID
 * @param windowDays - Analysis window in days (default: 90)
 * @returns Complete subscription analysis
 */
async function getSubscriptionAnalysis(userId, windowDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    // Get total spend
    const totalSpendResult = await (0, db_1.all)(`SELECT ABS(SUM(t.amount)) as total
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.account_id
     WHERE a.user_id = ? 
       AND t.date >= ?
       AND t.amount < 0`, [userId, cutoffDateStr]);
    const totalSpend = totalSpendResult[0]?.total || 0;
    const recurringMerchants = await findRecurringMerchants(userId, windowDays);
    const monthlyRecurringSpend = await calculateMonthlyRecurringSpend(userId, windowDays);
    const subscriptionShare = await calculateSubscriptionShare(userId, windowDays);
    return {
        recurringMerchants,
        monthlyRecurringSpend,
        subscriptionShare,
        totalSpend
    };
}
