// Find users that match each persona type (without assigning)
// This helps identify test users for each persona
// Usage: node scripts/find-users-by-persona.js

const path = require('path');
const sqlite3 = require(path.join(__dirname, '..', 'backend', 'node_modules', 'sqlite3')).verbose();

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

async function findHighUtilizationUsers() {
  // Users with utilization >= 50% OR interest charges OR minimum payment only
  const users = await all(`
    SELECT DISTINCT u.user_id, u.name, u.email,
           MAX(CAST(JSON_EXTRACT(a.balances, '$.current') AS REAL) / CAST(JSON_EXTRACT(a.balances, '$.limit') AS REAL) * 100) as max_utilization
    FROM users u
    INNER JOIN accounts a ON u.user_id = a.user_id
    WHERE a.type = 'credit'
      AND CAST(JSON_EXTRACT(a.balances, '$.limit') AS REAL) > 0
      AND CAST(JSON_EXTRACT(a.balances, '$.current') AS REAL) / CAST(JSON_EXTRACT(a.balances, '$.limit') AS REAL) >= 0.50
    GROUP BY u.user_id, u.name, u.email
    ORDER BY max_utilization DESC
    LIMIT 5
  `);
  return users;
}

async function findVariableIncomeUsers() {
  // Users with irregular income patterns (we'll need to check income stability)
  // For now, let's find users with fewer income transactions (indicating irregular income)
  const users = await all(`
    SELECT u.user_id, u.name, u.email,
           COUNT(DISTINCT DATE(t.date)) as income_days,
           COUNT(t.transaction_id) as income_count
    FROM users u
    INNER JOIN accounts a ON u.user_id = a.user_id
    INNER JOIN transactions t ON a.account_id = t.account_id
    WHERE a.type = 'checking'
      AND t.amount > 0
      AND t.personal_finance_category_primary = 'INCOME'
      AND t.date >= date('now', '-90 days')
    GROUP BY u.user_id, u.name, u.email
    HAVING income_count < 6  -- Less than 6 income transactions in 90 days (irregular)
    ORDER BY income_count ASC
    LIMIT 5
  `);
  return users;
}

async function findSubscriptionHeavyUsers() {
  // Users with many recurring subscriptions
  const users = await all(`
    SELECT u.user_id, u.name, u.email,
           COUNT(DISTINCT t.merchant_name) as unique_merchants,
           SUM(ABS(t.amount)) as total_spend
    FROM users u
    INNER JOIN accounts a ON u.user_id = a.user_id
    INNER JOIN transactions t ON a.account_id = t.account_id
    WHERE t.date >= date('now', '-90 days')
      AND t.merchant_name IN (
        'Netflix', 'Spotify', 'Amazon Prime', 'Disney+', 'Hulu', 
        'Apple Music', 'YouTube Premium', 'Adobe', 'Microsoft 365',
        'Gym Membership', 'Fitness App', 'Newsletter Subscription'
      )
    GROUP BY u.user_id, u.name, u.email
    HAVING unique_merchants >= 3
    ORDER BY unique_merchants DESC, total_spend DESC
    LIMIT 5
  `);
  return users;
}

async function findSavingsBuilderUsers() {
  // Users with savings accounts and low credit utilization
  const users = await all(`
    SELECT u.user_id, u.name, u.email,
           COUNT(DISTINCT CASE WHEN a.type = 'savings' THEN a.account_id END) as savings_accounts,
           MAX(CASE WHEN a.type = 'credit' 
             THEN CAST(JSON_EXTRACT(a.balances, '$.current') AS REAL) / CAST(JSON_EXTRACT(a.balances, '$.limit') AS REAL) * 100
             ELSE 0 END) as max_utilization
    FROM users u
    INNER JOIN accounts a ON u.user_id = a.user_id
    WHERE a.type IN ('savings', 'credit')
    GROUP BY u.user_id, u.name, u.email
    HAVING savings_accounts > 0
      AND (max_utilization < 30 OR max_utilization IS NULL)
    ORDER BY savings_accounts DESC, max_utilization ASC
    LIMIT 5
  `);
  return users;
}

async function findLifestyleCreepUsers() {
  // Users with high income and high discretionary spending
  const users = await all(`
    SELECT u.user_id, u.name, u.email,
           SUM(CASE WHEN t.amount > 0 AND t.personal_finance_category_primary = 'INCOME' THEN t.amount ELSE 0 END) as total_income,
           SUM(CASE WHEN t.amount < 0 AND t.personal_finance_category_primary IN ('FOOD_AND_DRINK', 'ENTERTAINMENT', 'TRAVEL') THEN ABS(t.amount) ELSE 0 END) as discretionary_spend
    FROM users u
    INNER JOIN accounts a ON u.user_id = a.user_id
    INNER JOIN transactions t ON a.account_id = t.account_id
    WHERE t.date >= date('now', '-90 days')
    GROUP BY u.user_id, u.name, u.email
    HAVING total_income > 5000  -- High income
      AND discretionary_spend > (total_income * 0.30)  -- >30% on discretionary
    ORDER BY discretionary_spend DESC
    LIMIT 5
  `);
  return users;
}

function formatPersonaType(type) {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function main() {
  console.log('\n🔍 Finding users by persona type...\n');
  console.log('='.repeat(80));
  
  try {
    // Find users for each persona
    console.log('\n1. HIGH UTILIZATION (utilization >= 50%):');
    console.log('-'.repeat(80));
    const highUtil = await findHighUtilizationUsers();
    if (highUtil.length > 0) {
      highUtil.forEach((user, idx) => {
        console.log(`   ${idx + 1}. ${user.name.padEnd(25)} | ${user.user_id} | Utilization: ${user.max_utilization?.toFixed(1)}%`);
      });
    } else {
      console.log('   No users found');
    }
    
    console.log('\n2. VARIABLE INCOME (irregular income patterns):');
    console.log('-'.repeat(80));
    const variableIncome = await findVariableIncomeUsers();
    if (variableIncome.length > 0) {
      variableIncome.forEach((user, idx) => {
        console.log(`   ${idx + 1}. ${user.name.padEnd(25)} | ${user.user_id} | Income transactions: ${user.income_count}`);
      });
    } else {
      console.log('   No users found');
    }
    
    console.log('\n3. SUBSCRIPTION HEAVY (3+ recurring subscriptions):');
    console.log('-'.repeat(80));
    const subscriptionHeavy = await findSubscriptionHeavyUsers();
    if (subscriptionHeavy.length > 0) {
      subscriptionHeavy.forEach((user, idx) => {
        console.log(`   ${idx + 1}. ${user.name.padEnd(25)} | ${user.user_id} | Subscriptions: ${user.unique_merchants}`);
      });
    } else {
      console.log('   No users found');
    }
    
    console.log('\n4. SAVINGS BUILDER (savings accounts + low utilization):');
    console.log('-'.repeat(80));
    const savingsBuilder = await findSavingsBuilderUsers();
    if (savingsBuilder.length > 0) {
      savingsBuilder.forEach((user, idx) => {
        console.log(`   ${idx + 1}. ${user.name.padEnd(25)} | ${user.user_id} | Savings accounts: ${user.savings_accounts}, Max util: ${user.max_utilization?.toFixed(1)}%`);
      });
    } else {
      console.log('   No users found');
    }
    
    console.log('\n5. LIFESTYLE CREEP (high income + high discretionary spending):');
    console.log('-'.repeat(80));
    const lifestyleCreep = await findLifestyleCreepUsers();
    if (lifestyleCreep.length > 0) {
      lifestyleCreep.forEach((user, idx) => {
        const discretionaryPercent = user.total_income > 0 ? (user.discretionary_spend / user.total_income * 100).toFixed(1) : 0;
        console.log(`   ${idx + 1}. ${user.name.padEnd(25)} | ${user.user_id} | Income: $${user.total_income.toFixed(2)}, Discretionary: ${discretionaryPercent}%`);
      });
    } else {
      console.log('   No users found');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 To test a user:');
    console.log('   1. Copy a user_id from above');
    console.log('   2. Go to http://localhost:3000');
    console.log('   3. Enter the user_id in the consent form');
    console.log('   4. Check consent and submit');
    console.log('   5. The persona will be assigned when the profile loads\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    db.close();
  }
}

main();

