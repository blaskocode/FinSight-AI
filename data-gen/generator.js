// Synthetic data generator for FinSight AI
// Generates 5 test users (1 per persona) with 3 months of transaction history

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Database path (relative to backend directory)
const DB_PATH = path.join(__dirname, '..', 'backend', 'finsight.db');

// Persona types
const PERSONAS = {
  HIGH_UTILIZATION: 'high_utilization',
  VARIABLE_INCOME: 'variable_income',
  SUBSCRIPTION_HEAVY: 'subscription_heavy',
  SAVINGS_BUILDER: 'savings_builder',
  LIFESTYLE_CREEP: 'lifestyle_creep'
};

// Helper: Generate random ID
function generateId(prefix = '') {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper: Random number in range
function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: Random float in range
function randomFloat(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// Helper: Random date within last N days
function randomDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - random(0, daysAgo));
  return date.toISOString().split('T')[0];
}

// Helper: Date N months ago
function monthsAgo(months) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().split('T')[0];
}

// Helper: Add days to date
function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// Helper: Get date for specific day of month
function getDateForDay(year, month, day) {
  const date = new Date(year, month - 1, day);
  return date.toISOString().split('T')[0];
}

// Initialize database connection
function getDatabase() {
  return new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      throw err;
    }
  });
}

// Database helper functions
function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Generate a user
function generateUser(personaType, index) {
  const names = [
    ['Alice', 'Johnson'],
    ['Bob', 'Smith'],
    ['Carol', 'Williams'],
    ['David', 'Brown'],
    ['Emma', 'Davis']
  ];
  
  const [firstName, lastName] = names[index];
  const userId = generateId('user-');
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index + 1}@example.com`;
  
  return {
    user_id: userId,
    email: email,
    name: `${firstName} ${lastName}`,
    persona: personaType
  };
}

// Generate accounts for a user
function generateAccounts(userId, personaType) {
  const accounts = [];
  
  // Always create a checking account
  const checkingId = generateId('acc-checking-');
  const checkingBalance = personaType === PERSONAS.HIGH_UTILIZATION 
    ? randomFloat(100, 500) // Low balance for high utilization
    : personaType === PERSONAS.VARIABLE_INCOME
    ? randomFloat(200, 1000) // Variable balance
    : randomFloat(1000, 5000); // Normal balance
  
  accounts.push({
    account_id: checkingId,
    user_id: userId,
    type: 'checking',
    subtype: 'checking',
    balances: JSON.stringify({
      available: checkingBalance,
      current: checkingBalance,
      limit: null
    }),
    iso_currency_code: 'USD'
  });
  
  // Always create a credit card
  const creditId = generateId('acc-credit-');
  const creditLimit = random(2000, 10000);
  let creditBalance;
  
  if (personaType === PERSONAS.HIGH_UTILIZATION) {
    creditBalance = Math.round(creditLimit * 0.65); // 65% utilization
  } else if (personaType === PERSONAS.SAVINGS_BUILDER) {
    creditBalance = Math.round(creditLimit * 0.15); // Low utilization
  } else {
    creditBalance = Math.round(creditLimit * randomFloat(0.20, 0.45));
  }
  
  accounts.push({
    account_id: creditId,
    user_id: userId,
    type: 'credit',
    subtype: 'credit_card',
    balances: JSON.stringify({
      available: creditLimit - creditBalance,
      current: creditBalance,
      limit: creditLimit
    }),
    iso_currency_code: 'USD'
  });
  
  // Create savings account for Savings Builder
  if (personaType === PERSONAS.SAVINGS_BUILDER) {
    const savingsId = generateId('acc-savings-');
    accounts.push({
      account_id: savingsId,
      user_id: userId,
      type: 'savings',
      subtype: 'savings',
      balances: JSON.stringify({
        available: randomFloat(5000, 20000),
        current: randomFloat(5000, 20000),
        limit: null
      }),
      iso_currency_code: 'USD'
    });
  }
  
  return { accounts, creditId, checkingId };
}

// Generate liability for credit card
function generateLiability(accountId, personaType, creditLimit, creditBalance) {
  const liabilityId = generateId('liab-');
  
  if (personaType === PERSONAS.HIGH_UTILIZATION) {
    // High utilization: interest charges, minimum payments
    const apr = randomFloat(18, 25);
    const minPayment = Math.max(25, Math.round(creditBalance * 0.02));
    const interestCharge = Math.round((creditBalance * apr / 100) / 12);
    
    return {
      liability_id: liabilityId,
      account_id: accountId,
      type: 'credit_card',
      apr_type: 'purchase',
      apr_percentage: apr,
      minimum_payment_amount: minPayment,
      last_payment_amount: minPayment, // Only minimum payments
      last_statement_balance: creditBalance,
      is_overdue: random(0, 10) < 2 ? 1 : 0, // 20% chance of overdue
      next_payment_due_date: addDays(new Date().toISOString().split('T')[0], random(5, 15))
    };
  } else {
    // Normal credit card
    const apr = randomFloat(12, 20);
    const minPayment = Math.max(25, Math.round(creditBalance * 0.02));
    const lastPayment = Math.round(creditBalance * randomFloat(0.5, 1.0)); // Pay more than minimum
    
    return {
      liability_id: liabilityId,
      account_id: accountId,
      type: 'credit_card',
      apr_type: 'purchase',
      apr_percentage: apr,
      minimum_payment_amount: minPayment,
      last_payment_amount: lastPayment,
      last_statement_balance: creditBalance,
      is_overdue: 0,
      next_payment_due_date: addDays(new Date().toISOString().split('T')[0], random(10, 25))
    };
  }
}

// Generate transactions for a user
function generateTransactions(userId, checkingId, creditId, personaType, startDate) {
  const transactions = [];
  const now = new Date();
  const start = new Date(startDate);
  
  // Income patterns
  const incomeAmount = personaType === PERSONAS.LIFESTYLE_CREEP 
    ? randomFloat(8000, 12000) // High income
    : personaType === PERSONAS.VARIABLE_INCOME
    ? randomFloat(2000, 6000) // Variable income
    : randomFloat(3000, 6000); // Normal income
  
  // Generate monthly income (1st of each month for simplicity)
  for (let month = 0; month < 3; month++) {
    const incomeDate = getDateForDay(
      start.getFullYear(),
      start.getMonth() + month + 1,
      1
    );
    
    // Variable income: irregular deposits
    if (personaType === PERSONAS.VARIABLE_INCOME && month > 0) {
      // Skip some months or vary amounts
      if (random(0, 10) < 3) continue; // 30% chance of missing a month
      const variedAmount = incomeAmount * randomFloat(0.6, 1.4);
      
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: checkingId,
        date: incomeDate,
        amount: Math.round(variedAmount * 100) / 100,
        merchant_name: 'Payroll Deposit',
        payment_channel: 'other',
        personal_finance_category_primary: 'INCOME',
        personal_finance_category_detailed: 'PAYROLL',
        pending: 0
      });
    } else {
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: checkingId,
        date: incomeDate,
        amount: Math.round(incomeAmount * 100) / 100,
        merchant_name: 'Payroll Deposit',
        payment_channel: 'other',
        personal_finance_category_primary: 'INCOME',
        personal_finance_category_detailed: 'PAYROLL',
        pending: 0
      });
    }
  }
  
  // Recurring payments (rent, subscriptions)
  const rentAmount = randomFloat(800, 2000);
  const subscriptions = [];
  
  if (personaType === PERSONAS.SUBSCRIPTION_HEAVY) {
    // 5-10 subscriptions
    const subCount = random(5, 10);
    const subNames = ['Netflix', 'Spotify', 'Amazon Prime', 'NYT', 'Gym Membership', 'Adobe Creative', 'Microsoft 365', 'Disney+', 'Hulu', 'Apple Music'];
    
    for (let i = 0; i < subCount; i++) {
      subscriptions.push({
        name: subNames[i % subNames.length],
        amount: randomFloat(5, 25)
      });
    }
  } else {
    // 1-2 subscriptions for others
    subscriptions.push({ name: 'Netflix', amount: randomFloat(10, 15) });
    if (random(0, 10) < 5) {
      subscriptions.push({ name: 'Spotify', amount: randomFloat(10, 15) });
    }
  }
  
  // Generate recurring payments for 3 months
  for (let month = 0; month < 3; month++) {
    const monthDate = getDateForDay(
      start.getFullYear(),
      start.getMonth() + month + 1,
      1
    );
    
    // Rent on 1st
    transactions.push({
      transaction_id: generateId('txn-'),
      account_id: checkingId,
      date: monthDate,
      amount: Math.round(rentAmount * 100) / 100,
      merchant_name: 'Rent Payment',
      payment_channel: 'other',
      personal_finance_category_primary: 'GENERAL_MERCHANDISE',
      personal_finance_category_detailed: 'RENT_AND_UTILITIES',
      pending: 0
    });
    
    // Subscriptions mid-month (15th)
    const subDate = getDateForDay(
      start.getFullYear(),
      start.getMonth() + month + 1,
      15
    );
    
    subscriptions.forEach(sub => {
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: creditId,
        date: subDate,
        amount: -Math.round(sub.amount * 100) / 100, // Negative for credit card charges
        merchant_name: sub.name,
        payment_channel: 'other',
        personal_finance_category_primary: 'GENERAL_MERCHANDISE',
        personal_finance_category_detailed: 'SUBSCRIPTIONS',
        pending: 0
      });
    });
  }
  
  // Variable spending: groceries, dining, shopping
  const daysInPeriod = 90;
  const groceryFrequency = personaType === PERSONAS.LIFESTYLE_CREEP ? 0.5 : 1.5; // Less groceries for lifestyle creep
  const diningFrequency = personaType === PERSONAS.LIFESTYLE_CREEP ? 8 : personaType === PERSONAS.HIGH_UTILIZATION ? 2 : 4;
  
  for (let day = 0; day < daysInPeriod; day++) {
    const date = addDays(startDate, day);
    
    // Groceries (1-2x per week)
    if (random(0, 100) < (groceryFrequency * 100 / 7)) {
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: checkingId,
        date: date,
        amount: -Math.round(randomFloat(50, 200) * 100) / 100,
        merchant_name: ['Kroger', 'Whole Foods', 'Trader Joe\'s', 'Safeway'][random(0, 3)],
        payment_channel: 'other',
        personal_finance_category_primary: 'FOOD_AND_DRINK',
        personal_finance_category_detailed: 'GROCERIES',
        pending: 0
      });
    }
    
    // Dining out
    if (random(0, 100) < (diningFrequency * 100 / 30)) {
      const diningAmount = personaType === PERSONAS.LIFESTYLE_CREEP 
        ? randomFloat(40, 120) // Higher dining for lifestyle creep
        : randomFloat(15, 50);
      
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: creditId,
        date: date,
        amount: -Math.round(diningAmount * 100) / 100,
        merchant_name: ['Chipotle', 'Starbucks', 'Local Restaurant'][random(0, 2)],
        payment_channel: 'other',
        personal_finance_category_primary: 'FOOD_AND_DRINK',
        personal_finance_category_detailed: 'RESTAURANTS',
        pending: 0
      });
    }
    
    // Shopping (less frequent)
    if (random(0, 100) < 5) { // ~5% chance per day
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: creditId,
        date: date,
        amount: -Math.round(randomFloat(30, 200) * 100) / 100,
        merchant_name: ['Amazon', 'Target', 'Costco'][random(0, 2)],
        payment_channel: 'other',
        personal_finance_category_primary: 'GENERAL_MERCHANDISE',
        personal_finance_category_detailed: 'ONLINE_PURCHASES',
        pending: 0
      });
    }
  }
  
  // Credit card payments (minimum for high utilization, more for others)
  for (let month = 0; month < 3; month++) {
    const paymentDate = getDateForDay(
      start.getFullYear(),
      start.getMonth() + month + 1,
      random(5, 10)
    );
    
    // Calculate payment amount based on persona
    const creditBalance = transactions
      .filter(t => t.account_id === creditId && new Date(t.date) <= new Date(paymentDate))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    let paymentAmount;
    if (personaType === PERSONAS.HIGH_UTILIZATION) {
      paymentAmount = Math.max(25, Math.round(creditBalance * 0.02)); // Minimum payment
    } else {
      paymentAmount = Math.round(creditBalance * randomFloat(0.5, 1.0)); // Pay more
    }
    
    transactions.push({
      transaction_id: generateId('txn-'),
      account_id: checkingId,
      date: paymentDate,
      amount: -Math.round(paymentAmount * 100) / 100,
      merchant_name: 'Credit Card Payment',
      payment_channel: 'other',
      personal_finance_category_primary: 'TRANSFER_OUT',
      personal_finance_category_detailed: 'CREDIT_CARD_PAYMENT',
      pending: 0
    });
  }
  
  // Savings transfers for Savings Builder
  if (personaType === PERSONAS.SAVINGS_BUILDER) {
    for (let month = 0; month < 3; month++) {
      const transferDate = getDateForDay(
        start.getFullYear(),
        start.getMonth() + month + 1,
        random(20, 25)
      );
      
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: checkingId,
        date: transferDate,
        amount: -Math.round(randomFloat(200, 500) * 100) / 100,
        merchant_name: 'Savings Transfer',
        payment_channel: 'other',
        personal_finance_category_primary: 'TRANSFER_OUT',
        personal_finance_category_detailed: 'SAVINGS',
        pending: 0
      });
    }
  }
  
  return transactions;
}

// Main generation function
async function generateData() {
  const db = getDatabase();
  const startDate = monthsAgo(3);
  
  try {
    console.log('Starting data generation...');
    console.log(`Generating data from ${startDate} to present`);
    
    const personaTypes = [
      PERSONAS.HIGH_UTILIZATION,
      PERSONAS.VARIABLE_INCOME,
      PERSONAS.SUBSCRIPTION_HEAVY,
      PERSONAS.SAVINGS_BUILDER,
      PERSONAS.LIFESTYLE_CREEP
    ];
    
    for (let i = 0; i < personaTypes.length; i++) {
      const personaType = personaTypes[i];
      console.log(`\nGenerating user ${i + 1}/5: ${personaType}`);
      
      // Generate user
      const user = generateUser(personaType, i);
      await run(db, 
        'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
        [user.user_id, user.email, user.name]
      );
      console.log(`  ✓ Created user: ${user.name} (${user.email})`);
      
      // Generate accounts
      const { accounts, creditId, checkingId } = generateAccounts(user.user_id, personaType);
      
      for (const account of accounts) {
        await run(db,
          'INSERT INTO accounts (account_id, user_id, type, subtype, balances, iso_currency_code) VALUES (?, ?, ?, ?, ?, ?)',
          [account.account_id, account.user_id, account.type, account.subtype, account.balances, account.iso_currency_code]
        );
      }
      console.log(`  ✓ Created ${accounts.length} accounts`);
      
      // Generate liability for credit card
      const creditAccount = accounts.find(a => a.type === 'credit');
      const creditBalance = JSON.parse(creditAccount.balances).current;
      const creditLimit = JSON.parse(creditAccount.balances).limit;
      
      const liability = generateLiability(creditId, personaType, creditLimit, creditBalance);
      await run(db,
        `INSERT INTO liabilities (liability_id, account_id, type, apr_type, apr_percentage, minimum_payment_amount, last_payment_amount, last_statement_balance, is_overdue, next_payment_due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [liability.liability_id, liability.account_id, liability.type, liability.apr_type, liability.apr_percentage,
         liability.minimum_payment_amount, liability.last_payment_amount, liability.last_statement_balance,
         liability.is_overdue, liability.next_payment_due_date]
      );
      console.log(`  ✓ Created liability (APR: ${liability.apr_percentage}%, Min Payment: $${liability.minimum_payment_amount})`);
      
      // Generate transactions
      const transactions = generateTransactions(user.user_id, checkingId, creditId, personaType, startDate);
      
      for (const txn of transactions) {
        await run(db,
          `INSERT INTO transactions (transaction_id, account_id, date, amount, merchant_name, payment_channel, personal_finance_category_primary, personal_finance_category_detailed, pending)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [txn.transaction_id, txn.account_id, txn.date, txn.amount, txn.merchant_name, txn.payment_channel,
           txn.personal_finance_category_primary, txn.personal_finance_category_detailed, txn.pending]
        );
      }
      console.log(`  ✓ Created ${transactions.length} transactions`);
    }
    
    console.log('\n✅ Data generation completed successfully!');
    console.log(`Generated 5 users with 3 months of transaction history`);
    
    // Verify data
    const userCount = await get(db, 'SELECT COUNT(*) as count FROM users');
    const accountCount = await get(db, 'SELECT COUNT(*) as count FROM accounts');
    const txnCount = await get(db, 'SELECT COUNT(*) as count FROM transactions');
    
    console.log(`\nVerification:`);
    console.log(`  Users: ${userCount.count}`);
    console.log(`  Accounts: ${accountCount.count}`);
    console.log(`  Transactions: ${txnCount.count}`);
    
  } catch (error) {
    console.error('Error generating data:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run if called directly
if (require.main === module) {
  generateData()
    .then(() => {
      console.log('\n✅ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Generation failed:', error);
      process.exit(1);
    });
}

module.exports = { generateData };

