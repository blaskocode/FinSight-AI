// Find users with active savings accounts and comprehensive financial activity
const path = require('path');
const sqlite3 = require(path.join(__dirname, '..', 'backend', 'node_modules', 'sqlite3')).verbose();

const dbPath = path.join(__dirname, '..', 'backend', 'finsight.db');
const db = new sqlite3.Database(dbPath);

console.log('Searching for users with active savings accounts and comprehensive data...\n');

// Find users with savings accounts that have recent activity
db.all(
  `SELECT DISTINCT u.user_id, u.name, u.email,
          (SELECT COUNT(*) FROM accounts a WHERE a.user_id = u.user_id AND a.type = 'savings') as savings_accounts,
          (SELECT COUNT(*) FROM accounts a WHERE a.user_id = u.user_id AND a.type = 'credit') as credit_accounts,
          (SELECT COUNT(*) FROM transactions t 
           JOIN accounts a ON t.account_id = a.account_id 
           WHERE a.user_id = u.user_id AND a.type = 'savings' 
           AND t.date >= date('now', '-180 days')) as savings_transactions,
          (SELECT COUNT(*) FROM transactions t 
           JOIN accounts a ON t.account_id = a.account_id 
           WHERE a.user_id = u.user_id 
           AND t.personal_finance_category_primary = 'INCOME'
           AND t.date >= date('now', '-180 days')) as income_transactions,
          (SELECT COUNT(*) FROM transactions t 
           JOIN accounts a ON t.account_id = a.account_id 
           WHERE a.user_id = u.user_id 
           AND t.amount < 0
           AND t.date >= date('now', '-90 days')) as spending_transactions
   FROM users u
   WHERE EXISTS (
     SELECT 1 FROM accounts a WHERE a.user_id = u.user_id AND a.type = 'savings'
   )
   AND EXISTS (
     SELECT 1 FROM accounts a WHERE a.user_id = u.user_id AND a.type = 'credit'
   )
   AND EXISTS (
     SELECT 1 FROM transactions t 
     JOIN accounts a ON t.account_id = a.account_id 
     WHERE a.user_id = u.user_id AND a.type = 'savings' 
     AND t.date >= date('now', '-180 days')
   )
   ORDER BY savings_transactions DESC, income_transactions DESC
   LIMIT 10`,
  [],
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    if (!rows || rows.length === 0) {
      console.log('No users found with active savings accounts');
      process.exit(0);
    }
    
    console.log(`Found ${rows.length} users with active savings accounts:\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    rows.forEach((row, idx) => {
      console.log(`\n${idx + 1}. ${row.name}`);
      console.log(`   User ID: ${row.user_id}`);
      console.log(`   Email: ${row.email}`);
      console.log(`   Savings Accounts: ${row.savings_accounts}`);
      console.log(`   Credit Accounts: ${row.credit_accounts}`);
      console.log(`   Recent Savings Transactions: ${row.savings_transactions}`);
      console.log(`   Recent Income Transactions: ${row.income_transactions}`);
      console.log(`   Recent Spending Transactions: ${row.spending_transactions}`);
      
      if (row.savings_transactions > 10 && row.income_transactions > 3 && row.spending_transactions > 20) {
        console.log(`   ✅ EXCELLENT CANDIDATE - Has comprehensive financial activity!`);
      }
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 To reassign persona with comprehensive metrics, run:');
    console.log('   ./scripts/reset-and-reassign-persona.sh <user_id>');
    console.log('   Then reload the profile in the frontend.\n');
    
    db.close();
  }
);

