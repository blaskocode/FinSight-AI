// Find users with comprehensive financial data (all metrics populated)
const path = require('path');
const sqlite3 = require(path.join(__dirname, '..', 'backend', 'node_modules', 'sqlite3')).verbose();

const dbPath = path.join(__dirname, '..', 'backend', 'finsight.db');
const db = new sqlite3.Database(dbPath);

console.log('Searching for users with comprehensive financial data...\n');

db.all(
  `SELECT p.user_id, u.name, u.email, p.persona_type, p.signals, p.assigned_at
   FROM personas p
   JOIN users u ON p.user_id = u.user_id
   ORDER BY p.assigned_at DESC`,
  [],
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    if (!rows || rows.length === 0) {
      console.log('No personas found in database');
      process.exit(0);
    }
    
    console.log(`Analyzing ${rows.length} users...\n`);
    
    const usersWithAllMetrics = [];
    const usersWithSomeMetrics = [];
    
    rows.forEach((row) => {
      const signals = JSON.parse(row.signals);
      
      const hasMetrics = {
        savingsRate: signals.savingsRate !== undefined && signals.savingsRate !== null,
        emergencyFundCoverage: signals.emergencyFundCoverage !== undefined && signals.emergencyFundCoverage !== null,
        cashFlowBuffer: signals.cashFlowBuffer !== undefined && signals.cashFlowBuffer !== null,
        monthlyRecurringSpend: signals.monthlyRecurringSpend !== undefined && signals.monthlyRecurringSpend !== null,
        monthlyIncome: signals.monthlyIncome !== undefined && signals.monthlyIncome !== null,
        paymentFrequency: signals.paymentFrequency !== undefined && signals.paymentFrequency !== null,
        utilization: signals.utilization !== undefined && signals.utilization !== null
      };
      
      const metricCount = Object.values(hasMetrics).filter(v => v).length;
      const hasAllKey = hasMetrics.savingsRate && hasMetrics.emergencyFundCoverage && 
                        hasMetrics.cashFlowBuffer && hasMetrics.monthlyRecurringSpend && 
                        hasMetrics.monthlyIncome && hasMetrics.paymentFrequency;
      
      const userData = {
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        persona: row.persona_type,
        metricCount: metricCount,
        hasMetrics: hasMetrics,
        signals: signals
      };
      
      if (hasAllKey) {
        usersWithAllMetrics.push(userData);
      } else if (metricCount >= 4) {
        usersWithSomeMetrics.push(userData);
      }
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 USERS WITH ALL KEY METRICS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (usersWithAllMetrics.length === 0) {
      console.log('❌ No users found with all metrics. Need to reassign personas with new code.\n');
    } else {
      usersWithAllMetrics.forEach((user, idx) => {
        console.log(`${idx + 1}. ${user.name} (${user.user_id})`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Persona: ${user.persona}`);
        console.log(`   Metrics: ${user.metricCount}/7`);
        console.log(`   ✅ Savings Rate: ${user.signals.savingsRate?.toFixed(1)}%`);
        console.log(`   ✅ Emergency Fund: ${user.signals.emergencyFundCoverage?.toFixed(1)} months`);
        console.log(`   ✅ Cash Flow Buffer: ${user.signals.cashFlowBuffer?.toFixed(1)} months`);
        console.log(`   ✅ Monthly Income: $${user.signals.monthlyIncome?.toFixed(2)}`);
        console.log(`   ✅ Monthly Recurring: $${user.signals.monthlyRecurringSpend?.toFixed(2)}`);
        console.log(`   ✅ Payment Frequency: ${user.signals.paymentFrequency}`);
        if (user.signals.utilization) {
          const util = typeof user.signals.utilization === 'number' 
            ? user.signals.utilization 
            : user.signals.utilization.utilization;
          console.log(`   ✅ Credit Utilization: ${util?.toFixed(1)}%`);
        }
        console.log('');
      });
    }
    
    if (usersWithSomeMetrics.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 USERS WITH PARTIAL METRICS (4+ metrics)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      usersWithSomeMetrics.slice(0, 5).forEach((user, idx) => {
        console.log(`${idx + 1}. ${user.name} (${user.user_id})`);
        console.log(`   Persona: ${user.persona}`);
        console.log(`   Metrics: ${user.metricCount}/7`);
        
        const metrics = [];
        if (user.hasMetrics.savingsRate) metrics.push(`Savings: ${user.signals.savingsRate.toFixed(1)}%`);
        if (user.hasMetrics.emergencyFundCoverage) metrics.push(`EF: ${user.signals.emergencyFundCoverage.toFixed(1)}mo`);
        if (user.hasMetrics.cashFlowBuffer) metrics.push(`Buffer: ${user.signals.cashFlowBuffer.toFixed(1)}mo`);
        if (user.hasMetrics.monthlyIncome) metrics.push(`Income: $${user.signals.monthlyIncome.toFixed(0)}`);
        if (user.hasMetrics.monthlyRecurringSpend) metrics.push(`Recurring: $${user.signals.monthlyRecurringSpend.toFixed(0)}`);
        if (user.hasMetrics.paymentFrequency) metrics.push(`Freq: ${user.signals.paymentFrequency}`);
        if (user.hasMetrics.utilization) {
          const util = typeof user.signals.utilization === 'number' 
            ? user.signals.utilization 
            : user.signals.utilization.utilization;
          metrics.push(`Util: ${util?.toFixed(1)}%`);
        }
        
        console.log(`   ${metrics.join(', ')}`);
        console.log('');
      });
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total users analyzed: ${rows.length}`);
    console.log(`Users with all key metrics: ${usersWithAllMetrics.length}`);
    console.log(`Users with 4+ metrics: ${usersWithSomeMetrics.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (usersWithAllMetrics.length === 0 && usersWithSomeMetrics.length === 0) {
      console.log('💡 TIP: All current personas were assigned with the old logic.');
      console.log('   To get comprehensive metrics, run:');
      console.log('   ./scripts/reset-and-reassign-persona.sh <user_id>');
      console.log('   Then reload the profile in the frontend.\n');
    }
    
    db.close();
  }
);

