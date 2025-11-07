// Quick script to check what signals are stored for a user
const path = require('path');
const sqlite3 = require(path.join(__dirname, '..', 'backend', 'node_modules', 'sqlite3')).verbose();

const dbPath = path.join(__dirname, '..', 'backend', 'finsight.db');
const db = new sqlite3.Database(dbPath);

const userId = process.argv[2];

if (!userId) {
  console.error('Usage: node check-user-signals.js <user_id>');
  process.exit(1);
}

db.get(
  `SELECT user_id, persona_type, signals, secondary_personas, assigned_at 
   FROM personas 
   WHERE user_id = ? 
   ORDER BY assigned_at DESC 
   LIMIT 1`,
  [userId],
  (err, row) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    if (!row) {
      console.log(`No persona found for user: ${userId}`);
      process.exit(0);
    }
    
    const signals = JSON.parse(row.signals);
    
    console.log('User ID:', row.user_id);
    console.log('Persona Type:', row.persona_type);
    console.log('Secondary Personas:', row.secondary_personas);
    console.log('Confidence:', signals.confidence || 'N/A');
    console.log('Assigned At:', row.assigned_at);
    console.log('\nSignals (parsed):');
    console.log(JSON.stringify(signals, null, 2));
    
    console.log('\n--- Available Metrics ---');
    if (signals.utilization) {
      const util = typeof signals.utilization === 'number' 
        ? signals.utilization 
        : signals.utilization?.utilization;
      console.log(`✅ Credit utilization: ${util}%`);
    } else {
      console.log('❌ Credit utilization: NOT AVAILABLE');
    }
    
    if (signals.savingsRate !== undefined && signals.savingsRate !== null) {
      console.log(`✅ Savings rate: ${signals.savingsRate}%`);
    } else {
      console.log('❌ Savings rate: NOT AVAILABLE');
    }
    
    if (signals.emergencyFundCoverage !== undefined && signals.emergencyFundCoverage !== null) {
      console.log(`✅ Emergency fund coverage: ${signals.emergencyFundCoverage} months`);
    } else {
      console.log('❌ Emergency fund coverage: NOT AVAILABLE');
    }
    
    if (signals.cashFlowBuffer !== undefined && signals.cashFlowBuffer !== null) {
      console.log(`✅ Cash flow buffer: ${signals.cashFlowBuffer} months`);
    } else {
      console.log('❌ Cash flow buffer: NOT AVAILABLE');
    }
    
    if (signals.monthlyRecurringSpend !== undefined && signals.monthlyRecurringSpend !== null) {
      console.log(`✅ Monthly recurring spend: $${signals.monthlyRecurringSpend}`);
    } else {
      console.log('❌ Monthly recurring spend: NOT AVAILABLE');
    }
    
    if (signals.interest_charges?.monthlyAverage) {
      console.log(`✅ Monthly interest charges: $${signals.interest_charges.monthlyAverage}`);
    } else {
      console.log('❌ Monthly interest charges: NOT AVAILABLE');
    }
    
    db.close();
  }
);

