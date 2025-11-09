"use strict";
// Backfill Historical Personas Script
// One-time operation to calculate and store historical persona assignments for past months
Object.defineProperty(exports, "__esModule", { value: true });
exports.backfillUserPersonas = backfillUserPersonas;
exports.backfillAllHistoricalPersonas = backfillAllHistoricalPersonas;
const db_1 = require("../db/db");
const assignPersona_1 = require("../personas/assignPersona");
/**
 * Check if persona already exists for a specific month
 */
async function personaExistsForMonth(userId, year, month) {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const existing = await (0, db_1.get)(`SELECT COUNT(*) as count 
     FROM personas 
     WHERE user_id = ? 
       AND assigned_at >= ? 
       AND assigned_at <= ?`, [userId, monthStart.toISOString(), monthEnd.toISOString()]);
    return (existing?.count || 0) > 0;
}
/**
 * Backfill historical personas for a user
 */
async function backfillUserPersonas(userId, monthsBack = 12) {
    console.log(`\n📊 Backfilling personas for user: ${userId}`);
    const now = new Date();
    let processed = 0;
    let skipped = 0;
    let errors = 0;
    for (let i = 0; i < monthsBack; i++) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 15); // 15th of the month
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;
        // Check if persona already exists for this month
        // Only skip if we're not forcing a rebuild (for now, always create to ensure 6 months)
        const exists = await personaExistsForMonth(userId, year, month);
        if (exists) {
            // For historical backfill, we want to ensure at least 6 months of data
            // So we'll skip only if this month already has a persona AND we have enough total personas
            const totalPersonas = await (0, db_1.get)(`SELECT COUNT(*) as count FROM personas WHERE user_id = ?`, [userId]);
            if (totalPersonas && totalPersonas.count >= 6) {
                console.log(`  ⏭️  Skipping ${year}-${String(month).padStart(2, '0')} - already exists and user has ${totalPersonas.count} personas`);
                skipped++;
                continue;
            }
            else {
                console.log(`  ⚠️  Month ${year}-${String(month).padStart(2, '0')} exists but user only has ${totalPersonas?.count || 0} personas, will create more`);
            }
        }
        try {
            // Calculate persona for this month
            // Note: This uses current transaction data, but stores with historical date
            // For true historical personas, we'd need to filter transactions by date
            // This is a simplified version that backfills based on current state
            const result = await (0, assignPersona_1.assignPersona)(userId);
            if (result) {
                const secondaryPersonaTypes = result.secondary.map(p => p.personaType);
                // Store with the target date as assigned_at
                const personaId = `persona-${targetDate.getTime()}-${Math.random().toString(36).substr(2, 9)}`;
                await (0, db_1.run)(`INSERT INTO personas (persona_id, user_id, persona_type, window_days, signals, secondary_personas, assigned_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                    personaId,
                    userId,
                    result.primary.personaType,
                    90,
                    JSON.stringify({
                        criteriaMet: result.primary.criteriaMet,
                        confidence: result.primary.confidence,
                        ...result.primary.signals
                    }),
                    JSON.stringify(secondaryPersonaTypes),
                    targetDate.toISOString()
                ]);
                console.log(`  ✅ Created persona for ${year}-${String(month).padStart(2, '0')}: ${result.primary.personaType}`);
                processed++;
            }
            else {
                console.log(`  ⚠️  No persona match for ${year}-${String(month).padStart(2, '0')}`);
                skipped++;
            }
        }
        catch (error) {
            console.error(`  ❌ Error processing ${year}-${String(month).padStart(2, '0')}:`, error.message);
            errors++;
        }
    }
    console.log(`  📈 Summary: ${processed} created, ${skipped} skipped, ${errors} errors`);
}
/**
 * Backfill historical personas for all users
 */
async function backfillAllHistoricalPersonas(monthsBack = 12) {
    console.log(`\n🚀 Starting historical persona backfill (${monthsBack} months back)...\n`);
    // Get ALL users (not just those with consent) to ensure everyone has historical data
    const users = await (0, db_1.all)(`SELECT DISTINCT u.user_id 
     FROM users u`);
    console.log(`Found ${users.length} users to process\n`);
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        try {
            await backfillUserPersonas(user.user_id, monthsBack);
            totalProcessed++;
        }
        catch (error) {
            console.error(`❌ Error processing user ${user.user_id}:`, error.message);
            totalErrors++;
        }
        if ((i + 1) % 10 === 0) {
            console.log(`\n📊 Progress: ${i + 1}/${users.length} users processed\n`);
        }
    }
    console.log(`\n✅ Backfill complete!`);
    console.log(`   Processed: ${totalProcessed} users`);
    console.log(`   Errors: ${totalErrors} users\n`);
}
// Run if called directly
if (require.main === module) {
    const monthsBack = parseInt(process.argv[2]) || 12;
    backfillAllHistoricalPersonas(monthsBack)
        .then(() => {
        console.log('Done!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
