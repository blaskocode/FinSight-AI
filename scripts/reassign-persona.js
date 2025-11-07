// Script to trigger persona re-assignment for a user
// This will recalculate ALL metrics (savings, income, subscriptions, credit)
const path = require('path');

// Dynamically require from backend's compiled output
const assignPersonaPath = path.join(__dirname, '..', 'backend', 'personas', 'assignPersona.js');
const storePersonaPath = path.join(__dirname, '..', 'backend', 'services', 'personaService.js');

const { assignPersona } = require(assignPersonaPath);
const { storePersonaAssignment } = require(storePersonaPath);

const userId = process.argv[2];

if (!userId) {
  console.error('Usage: node reassign-persona.js <user_id>');
  process.exit(1);
}

console.log(`Reassigning persona for user: ${userId}`);
console.log('Calculating comprehensive financial metrics...\n');

assignPersona(userId)
  .then(async (result) => {
    if (!result) {
      console.log('❌ No persona matched for this user');
      process.exit(1);
    }

    console.log('✅ Persona assigned:');
    console.log('Primary:', result.primary.personaType);
    console.log('Confidence:', result.primary.confidence);
    console.log('Secondary:', result.secondary.map(s => s.personaType).join(', ') || 'None');
    
    console.log('\n📊 Available Metrics:');
    const signals = result.primary.signals;
    
    if (signals.utilization) {
      console.log(`  ✅ Credit utilization: ${signals.utilization.utilization?.toFixed(1)}%`);
    }
    if (signals.savingsRate !== undefined && signals.savingsRate !== null) {
      console.log(`  ✅ Savings rate: ${signals.savingsRate.toFixed(1)}%`);
    }
    if (signals.emergencyFundCoverage !== undefined && signals.emergencyFundCoverage !== null) {
      console.log(`  ✅ Emergency fund coverage: ${signals.emergencyFundCoverage.toFixed(1)} months`);
    }
    if (signals.monthlyIncome !== undefined && signals.monthlyIncome !== null) {
      console.log(`  ✅ Monthly income: $${signals.monthlyIncome.toFixed(2)}`);
    }
    if (signals.cashFlowBuffer !== undefined && signals.cashFlowBuffer !== null) {
      console.log(`  ✅ Cash flow buffer: ${signals.cashFlowBuffer.toFixed(1)} months`);
    }
    if (signals.monthlyRecurringSpend !== undefined && signals.monthlyRecurringSpend !== null) {
      console.log(`  ✅ Monthly recurring spend: $${signals.monthlyRecurringSpend.toFixed(2)}`);
    }
    if (signals.subscriptionCount !== undefined && signals.subscriptionCount !== null) {
      console.log(`  ✅ Subscription count: ${signals.subscriptionCount}`);
    }

    // Store the updated persona
    console.log('\nStoring updated persona in database...');
    await storePersonaAssignment(userId, result.primary, result.secondary);
    console.log('✅ Persona stored successfully!\n');
    console.log('You can now ask the AI chat about any of these metrics.');
    
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });

