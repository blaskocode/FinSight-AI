// Debug why a specific user gets assigned a persona
// Usage: node scripts/debug-user-persona.js <user_id>

const path = require('path');
const sqlite3 = require(path.join(__dirname, '..', 'backend', 'node_modules', 'sqlite3')).verbose();
const { assignHighUtilizationPersona, assignSavingsBuilderPersona } = require(path.join(__dirname, '..', 'backend', 'personas', 'assignPersona.js'));

const userId = process.argv[2] || 'user-1762523420216-5meglnyw6';

const DB_PATH = path.join(__dirname, '..', 'backend', 'finsight.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function debugUser(userId) {
  console.log(`\n🔍 Debugging persona assignment for user: ${userId}\n`);
  console.log('='.repeat(80));
  
  // Get user info
  const user = await get('SELECT name, email FROM users WHERE user_id = ?', [userId]);
  if (!user) {
    console.log('❌ User not found!');
    db.close();
    return;
  }
  
  console.log(`\nUser: ${user.name} (${user.email})\n`);
  
  // Check credit accounts
  const creditAccounts = await all(`
    SELECT account_id, subtype, balances
    FROM accounts
    WHERE user_id = ? AND type = 'credit'
  `, [userId]);
  
  console.log(`Credit Accounts: ${creditAccounts.length}`);
  
  for (const account of creditAccounts) {
    const balances = JSON.parse(account.balances);
    const balance = balances.current || 0;
    const limit = balances.limit || 0;
    const utilization = limit > 0 ? (balance / limit * 100) : 0;
    
    console.log(`\n  Account: ${account.account_id}`);
    console.log(`    Balance: $${balance.toFixed(2)}`);
    console.log(`    Limit: $${limit.toFixed(2)}`);
    console.log(`    Utilization: ${utilization.toFixed(1)}%`);
    
    // Check for interest charges
    const interestCharges = await all(`
      SELECT SUM(ABS(amount)) as total, COUNT(*) as count
      FROM transactions
      WHERE account_id = ?
        AND date >= date('now', '-90 days')
        AND (merchant_name LIKE '%interest%' OR merchant_name LIKE '%Interest%' OR merchant_name LIKE '%INTEREST%')
        AND amount < 0
    `, [account.account_id]);
    
    const interest = interestCharges[0];
    if (interest && interest.total > 0) {
      console.log(`    ⚠️  Interest Charges: $${interest.total.toFixed(2)} (${interest.count} transactions)`);
    } else {
      console.log(`    ✅ No interest charges`);
    }
    
    // Check for minimum payment only
    const payments = await all(`
      SELECT amount, date, merchant_name
      FROM transactions
      WHERE account_id = ?
        AND date >= date('now', '-90 days')
        AND amount > 0
        AND (merchant_name LIKE '%payment%' OR merchant_name LIKE '%Payment%' OR merchant_name LIKE '%PAYMENT%')
      ORDER BY date DESC
      LIMIT 5
    `, [account.account_id]);
    
    if (payments.length > 0) {
      console.log(`    Recent payments: ${payments.length} found`);
      payments.forEach(p => {
        console.log(`      - $${p.amount.toFixed(2)} on ${p.date} (${p.merchant_name})`);
      });
    }
    
    // Check liabilities
    const liability = await get(`
      SELECT minimum_payment_amount, last_statement_balance, is_overdue
      FROM liabilities
      WHERE account_id = ?
    `, [account.account_id]);
    
    if (liability) {
      console.log(`    Liability Info:`);
      console.log(`      Minimum Payment: $${liability.minimum_payment_amount?.toFixed(2) || 'N/A'}`);
      console.log(`      Statement Balance: $${liability.last_statement_balance?.toFixed(2) || 'N/A'}`);
      console.log(`      Overdue: ${liability.is_overdue ? 'YES ⚠️' : 'No ✅'}`);
    }
  }
  
  // Check High Utilization criteria
  console.log(`\n${'='.repeat(80)}`);
  console.log('\n🔍 HIGH UTILIZATION PERSONA CHECK:');
  console.log('-'.repeat(80));
  console.log('Criteria: utilization ≥50% OR interest > 0 OR min payment only OR overdue');
  
  const highUtil = await assignHighUtilizationPersona(userId);
  if (highUtil) {
    console.log(`\n✅ MATCHES High Utilization!`);
    console.log(`   Persona Type: ${highUtil.personaType}`);
    console.log(`   Criteria Met: ${highUtil.criteriaMet.join(', ')}`);
    console.log(`   Confidence: ${(highUtil.confidence * 100).toFixed(1)}%`);
  } else {
    console.log(`\n❌ Does NOT match High Utilization`);
  }
  
  // Check Savings Builder criteria
  console.log(`\n${'='.repeat(80)}`);
  console.log('\n🔍 SAVINGS BUILDER PERSONA CHECK:');
  console.log('-'.repeat(80));
  console.log('Criteria: Savings growth ≥2% OR net inflow ≥$200/month AND all card utilizations < 30%');
  
  const savingsBuilder = await assignSavingsBuilderPersona(userId);
  if (savingsBuilder) {
    console.log(`\n✅ MATCHES Savings Builder!`);
    console.log(`   Persona Type: ${savingsBuilder.personaType}`);
    console.log(`   Criteria Met: ${savingsBuilder.criteriaMet.join(', ')}`);
    console.log(`   Confidence: ${(savingsBuilder.confidence * 100).toFixed(1)}%`);
  } else {
    console.log(`\n❌ Does NOT match Savings Builder`);
  }
  
  // Check all personas
  console.log(`\n${'='.repeat(80)}`);
  console.log('\n🎯 FINAL PERSONA ASSIGNMENT:');
  console.log('-'.repeat(80));
  
  const { assignPersona } = require(path.join(__dirname, '..', 'backend', 'personas', 'assignPersona.js'));
  const assignment = await assignPersona(userId);
  
  if (assignment) {
    console.log(`\nPrimary Persona: ${assignment.primary.personaType}`);
    console.log(`   Criteria: ${assignment.primary.criteriaMet.join(', ')}`);
    console.log(`   Confidence: ${(assignment.primary.confidence * 100).toFixed(1)}%`);
    
    if (assignment.secondary.length > 0) {
      console.log(`\nSecondary Personas:`);
      assignment.secondary.forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.personaType} (${(p.confidence * 100).toFixed(1)}% confidence)`);
      });
    }
  } else {
    console.log(`\n❌ No persona assigned`);
  }
  
  console.log(`\n${'='.repeat(80)}\n`);
}

async function main() {
  try {
    await debugUser(userId);
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    db.close();
  }
}

main();

