// Directly calculate and inject comprehensive metrics into existing persona
// This bypasses the ts-node caching issue
const path = require('path');
const sqlite3 = require(path.join(__dirname, '..', 'backend', 'node_modules', 'sqlite3')).verbose();

const dbPath = path.join(__dirname, '..', 'backend', 'finsight.db');
const db = new sqlite3.Database(dbPath);

const userId = process.argv[2] || 'user-1762524842070-fl7lie322';

console.log(`\n🔧 Injecting comprehensive metrics for: ${userId}\n`);

// Import the feature detection modules via ts-node
const tsNode = require(path.join(__dirname, '..', 'backend', 'node_modules', 'ts-node'));
tsNode.register({
  project: path.join(__dirname, '..', 'backend', 'tsconfig.json'),
  transpileOnly: true
});

const { getCreditSignals } = require('../backend/features/creditMonitoring.ts');
const { getSavingsAnalysis } = require('../backend/features/savingsAnalysis.ts');
const { getIncomeStabilityAnalysis } = require('../backend/features/incomeStability.ts');
const { getSubscriptionAnalysis } = require('../backend/features/subscriptionDetection.ts');

async function injectMetrics() {
  try {
    console.log('📊 Calculating comprehensive metrics...\n');
    
    const metrics = {};
    
    // Get credit accounts
    const creditAccounts = await new Promise((resolve, reject) => {
      db.all(
        'SELECT account_id FROM accounts WHERE user_id = ? AND type = "credit"',
        [userId],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });
    
    if (creditAccounts.length > 0) {
      console.log(`  ✅ Found ${creditAccounts.length} credit account(s)`);
      const creditSignals = await getCreditSignals(creditAccounts[0].account_id, 90);
      metrics.utilization = creditSignals.utilization;
      metrics.interest_charges = creditSignals.interestCharges;
      console.log(`     Utilization: ${creditSignals.utilization.utilization.toFixed(1)}%`);
    }
    
    // Savings analysis
    console.log('  📈 Calculating savings analysis...');
    const savingsAnalysis = await getSavingsAnalysis(userId, 180);
    if (savingsAnalysis) {
      metrics.savingsRate = savingsAnalysis.savingsRate;
      metrics.emergencyFundCoverage = savingsAnalysis.emergencyFundCoverage;
      console.log(`     Savings rate: ${savingsAnalysis.savingsRate.toFixed(1)}%`);
      console.log(`     Emergency fund: ${savingsAnalysis.emergencyFundCoverage.toFixed(1)} months`);
    }
    
    // Income analysis
    console.log('  💰 Calculating income analysis...');
    const incomeAnalysis = await getIncomeStabilityAnalysis(userId);
    if (incomeAnalysis) {
      metrics.monthlyIncome = incomeAnalysis.averageIncome;
      metrics.cashFlowBuffer = incomeAnalysis.cashFlowBuffer;
      metrics.paymentFrequency = incomeAnalysis.paymentFrequency;
      metrics.payGapVariability = incomeAnalysis.payGapVariability;
      console.log(`     Monthly income: $${incomeAnalysis.averageIncome.toFixed(2)}`);
      console.log(`     Cash flow buffer: ${incomeAnalysis.cashFlowBuffer.toFixed(1)} months`);
      console.log(`     Payment frequency: ${incomeAnalysis.paymentFrequency}`);
    }
    
    // Subscription analysis
    console.log('  🔄 Calculating subscription analysis...');
    const subscriptionAnalysis = await getSubscriptionAnalysis(userId, 90);
    if (subscriptionAnalysis) {
      metrics.monthlyRecurringSpend = subscriptionAnalysis.monthlyRecurringSpend;
      metrics.subscriptionShare = subscriptionAnalysis.subscriptionShare;
      metrics.subscriptionCount = subscriptionAnalysis.recurringMerchants.length;
      console.log(`     Monthly recurring: $${subscriptionAnalysis.monthlyRecurringSpend.toFixed(2)}`);
      console.log(`     Subscription count: ${subscriptionAnalysis.recurringMerchants.length}`);
    }
    
    // Get existing persona
    const persona = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM personas WHERE user_id = ? ORDER BY assigned_at DESC LIMIT 1',
        [userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });
    
    if (!persona) {
      console.log('\n❌ No persona found for user');
      db.close();
      process.exit(1);
    }
    
    // Merge metrics into existing signals
    const existingSignals = JSON.parse(persona.signals);
    const updatedSignals = {
      ...existingSignals,
      ...metrics
    };
    
    // Update database
    console.log('\n💾 Updating persona in database...');
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE personas SET signals = ? WHERE persona_id = ?',
        [JSON.stringify(updatedSignals), persona.persona_id],
        (err) => err ? reject(err) : resolve()
      );
    });
    
    console.log('✅ Comprehensive metrics injected successfully!\n');
    console.log('📊 Updated signals:');
    console.log(JSON.stringify(updatedSignals, null, 2));
    
    db.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    db.close();
    process.exit(1);
  }
}

injectMetrics();

