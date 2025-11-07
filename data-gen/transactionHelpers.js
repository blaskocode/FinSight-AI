// Helper functions for transaction generation
// SECURITY REVIEW: Manual security review performed (Semgrep MCP unavailable)
// - No user input handling (all data is generated internally)
// - No SQL queries (data generation only, no database access)
// - No external API calls
// - No file system operations
// - Safe for data generation purposes

const { helpers } = require('./generator');
const { generateId, random, randomFloat, getDateForDay, addDays } = helpers;
const {
  GROCERY_STORES,
  DINING_RESTAURANTS,
  SUBSCRIPTIONS,
  UTILITIES,
  SHOPPING,
  TRAVEL,
  ENTERTAINMENT
} = require('./merchants');

const PERSONAS = {
  HIGH_UTILIZATION: 'high_utilization',
  VARIABLE_INCOME: 'variable_income',
  SUBSCRIPTION_HEAVY: 'subscription_heavy',
  SAVINGS_BUILDER: 'savings_builder',
  LIFESTYLE_CREEP: 'lifestyle_creep'
};

// Generate income transactions based on pattern
function generateIncomeTransactions(checkingId, personaType, baseIncomeAmount, incomePattern, startDate, monthsToGenerate, now) {
  const transactions = [];
  const start = new Date(startDate);
  
  for (let month = 0; month < monthsToGenerate; month++) {
    if (incomePattern === 'monthly') {
      const incomeDate = getDateForDay(start.getFullYear(), start.getMonth() + month + 1, 1);
      let amount = baseIncomeAmount;
      
      if (personaType === PERSONAS.VARIABLE_INCOME) {
        if (random(0, 10) < 3) continue; // 30% chance of missing
        amount = baseIncomeAmount * randomFloat(0.6, 1.4);
      }
      
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: checkingId,
        date: incomeDate,
        amount: Math.round(amount * 100) / 100,
        merchant_name: 'Payroll Deposit',
        payment_channel: 'ach',
        personal_finance_category_primary: 'INCOME',
        personal_finance_category_detailed: 'PAYROLL',
        pending: 0
      });
    } else if (incomePattern === 'biweekly') {
      const firstPayDate = getDateForDay(start.getFullYear(), start.getMonth() + month + 1, 1);
      const secondPayDate = addDays(firstPayDate, 14);
      const biweeklyAmount = baseIncomeAmount / 2;
      
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: checkingId,
        date: firstPayDate,
        amount: Math.round(biweeklyAmount * 100) / 100,
        merchant_name: 'Payroll Deposit',
        payment_channel: 'ach',
        personal_finance_category_primary: 'INCOME',
        personal_finance_category_detailed: 'PAYROLL',
        pending: 0
      });
      
      if (new Date(secondPayDate) <= now) {
        transactions.push({
          transaction_id: generateId('txn-'),
          account_id: checkingId,
          date: secondPayDate,
          amount: Math.round(biweeklyAmount * 100) / 100,
          merchant_name: 'Payroll Deposit',
          payment_channel: 'ach',
          personal_finance_category_primary: 'INCOME',
          personal_finance_category_detailed: 'PAYROLL',
          pending: 0
        });
      }
    } else if (incomePattern === 'twice-monthly') {
      const firstPayDate = getDateForDay(start.getFullYear(), start.getMonth() + month + 1, 1);
      const secondPayDate = getDateForDay(start.getFullYear(), start.getMonth() + month + 1, 15);
      const halfAmount = baseIncomeAmount / 2;
      
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: checkingId,
        date: firstPayDate,
        amount: Math.round(halfAmount * 100) / 100,
        merchant_name: 'Payroll Deposit',
        payment_channel: 'ach',
        personal_finance_category_primary: 'INCOME',
        personal_finance_category_detailed: 'PAYROLL',
        pending: 0
      });
      
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: checkingId,
        date: secondPayDate,
        amount: Math.round(halfAmount * 100) / 100,
        merchant_name: 'Payroll Deposit',
        payment_channel: 'ach',
        personal_finance_category_primary: 'INCOME',
        personal_finance_category_detailed: 'PAYROLL',
        pending: 0
      });
    } else if (incomePattern === 'variable') {
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + month + 1, 0).getDate();
      const payDay = random(1, daysInMonth);
      const incomeDate = getDateForDay(start.getFullYear(), start.getMonth() + month + 1, payDay);
      
      if (random(0, 10) < 2) continue; // 20% chance of missing
      const variedAmount = baseIncomeAmount * randomFloat(0.5, 1.5);
      
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: checkingId,
        date: incomeDate,
        amount: Math.round(variedAmount * 100) / 100,
        merchant_name: 'Payroll Deposit',
        payment_channel: 'ach',
        personal_finance_category_primary: 'INCOME',
        personal_finance_category_detailed: 'PAYROLL',
        pending: 0
      });
    }
  }
  
  return transactions;
}

// Generate recurring payments (rent, subscriptions, utilities)
function generateRecurringPayments(checkingId, creditId, personaType, subscriptions, rentAmount, startDate, monthsToGenerate) {
  const transactions = [];
  const start = new Date(startDate);
  
  for (let month = 0; month < monthsToGenerate; month++) {
    const monthDate = getDateForDay(start.getFullYear(), start.getMonth() + month + 1, 1);
    
    // Rent on 1st
    transactions.push({
      transaction_id: require('./generator').generateId('txn-'),
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
    const subDate = getDateForDay(start.getFullYear(), start.getMonth() + month + 1, 15);
    subscriptions.forEach(sub => {
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: creditId,
        date: subDate,
        amount: -Math.round(sub.amount * 100) / 100,
        merchant_name: sub.name,
        payment_channel: 'online',
        personal_finance_category_primary: 'GENERAL_MERCHANDISE',
        personal_finance_category_detailed: 'SUBSCRIPTIONS',
        pending: 0
      });
    });
    
    // Utilities (end of month)
    const utilDate = getDateForDay(start.getFullYear(), start.getMonth() + month + 1, random(25, 28));
    transactions.push({
      transaction_id: require('./generator').generateId('txn-'),
      account_id: checkingId,
      date: utilDate,
      amount: -Math.round(randomFloat(100, 300) * 100) / 100,
      merchant_name: UTILITIES[random(0, UTILITIES.length - 1)],
      payment_channel: 'other',
      personal_finance_category_primary: 'GENERAL_MERCHANDISE',
      personal_finance_category_detailed: 'RENT_AND_UTILITIES',
      pending: 0
    });
  }
  
  return transactions;
}

// Generate variable spending (groceries, dining, shopping, travel, entertainment)
function generateVariableSpending(checkingId, creditId, personaType, startDate, monthsToGenerate, now) {
  const transactions = [];
  const daysInPeriod = monthsToGenerate * 30;
  const groceryFrequency = personaType === PERSONAS.LIFESTYLE_CREEP ? 0.5 : 1.5;
  const diningFrequency = personaType === PERSONAS.LIFESTYLE_CREEP ? 8 : personaType === PERSONAS.HIGH_UTILIZATION ? 2 : 4;
  const travelFrequency = personaType === PERSONAS.LIFESTYLE_CREEP ? 0.3 : 0.1;
  const entertainmentFrequency = personaType === PERSONAS.LIFESTYLE_CREEP ? 0.5 : 0.2;
  
  for (let day = 0; day < daysInPeriod; day++) {
    const date = addDays(startDate, day);
    if (new Date(date) > now) break;
    
    // Groceries
    if (random(0, 100) < (groceryFrequency * 100 / 7)) {
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: checkingId,
        date: date,
        amount: -Math.round(randomFloat(50, 200) * 100) / 100,
        merchant_name: GROCERY_STORES[random(0, GROCERY_STORES.length - 1)],
        payment_channel: 'in_store',
        personal_finance_category_primary: 'FOOD_AND_DRINK',
        personal_finance_category_detailed: 'GROCERIES',
        pending: 0
      });
    }
    
    // Dining out
    if (random(0, 100) < (diningFrequency * 100 / 30)) {
      const diningAmount = personaType === PERSONAS.LIFESTYLE_CREEP 
        ? randomFloat(40, 120)
        : randomFloat(15, 50);
      
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: creditId,
        date: date,
        amount: -Math.round(diningAmount * 100) / 100,
        merchant_name: DINING_RESTAURANTS[random(0, DINING_RESTAURANTS.length - 1)],
        payment_channel: 'in_store',
        personal_finance_category_primary: 'FOOD_AND_DRINK',
        personal_finance_category_detailed: 'RESTAURANTS',
        pending: 0
      });
    }
    
    // Shopping
    if (random(0, 100) < 5) {
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: creditId,
        date: date,
        amount: -Math.round(randomFloat(30, 200) * 100) / 100,
        merchant_name: SHOPPING[random(0, SHOPPING.length - 1)],
        payment_channel: random(0, 10) < 7 ? 'online' : 'in_store',
        personal_finance_category_primary: 'GENERAL_MERCHANDISE',
        personal_finance_category_detailed: 'ONLINE_PURCHASES',
        pending: 0
      });
    }
    
    // Travel (for lifestyle creep)
    if (random(0, 100) < (travelFrequency * 100 / 30)) {
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: creditId,
        date: date,
        amount: -Math.round(randomFloat(200, 1000) * 100) / 100,
        merchant_name: TRAVEL[random(0, TRAVEL.length - 1)],
        payment_channel: 'online',
        personal_finance_category_primary: 'TRAVEL',
        personal_finance_category_detailed: 'TRAVEL',
        pending: 0
      });
    }
    
    // Entertainment (for lifestyle creep)
    if (random(0, 100) < (entertainmentFrequency * 100 / 30)) {
      transactions.push({
        transaction_id: generateId('txn-'),
        account_id: creditId,
        date: date,
        amount: -Math.round(randomFloat(50, 300) * 100) / 100,
        merchant_name: ENTERTAINMENT[random(0, ENTERTAINMENT.length - 1)],
        payment_channel: 'in_store',
        personal_finance_category_primary: 'ENTERTAINMENT',
        personal_finance_category_detailed: 'ENTERTAINMENT',
        pending: 0
      });
    }
  }
  
  return transactions;
}

module.exports = {
  generateIncomeTransactions,
  generateRecurringPayments,
  generateVariableSpending
};

