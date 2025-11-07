"use strict";
// Debt Payment Plan Generator Module
// Generates personalized debt payment plans using avalanche or snowball strategies
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAvailableCashFlow = calculateAvailableCashFlow;
exports.generatePaymentPlan = generatePaymentPlan;
exports.generatePaymentPlansComparison = generatePaymentPlansComparison;
const db_1 = require("../db/db");
const incomeStability_1 = require("../features/incomeStability");
const savingsAnalysis_1 = require("../features/savingsAnalysis");
/**
 * Get all debts for a user
 */
async function getUserDebts(userId) {
    const debts = await (0, db_1.all)(`SELECT l.liability_id, l.account_id, l.type, l.apr_percentage, l.interest_rate, 
            l.minimum_payment_amount, l.last_statement_balance,
            a.subtype as account_name
     FROM liabilities l
     JOIN accounts a ON l.account_id = a.account_id
     WHERE a.user_id = ?
       AND l.type IN ('credit_card', 'student_loan')
       AND l.last_statement_balance > 0
     ORDER BY l.last_statement_balance DESC`, [userId]);
    return debts.map(debt => ({
        liabilityId: debt.liability_id,
        accountId: debt.account_id,
        type: debt.type,
        balance: debt.last_statement_balance || 0,
        apr: debt.apr_percentage || debt.interest_rate || 0,
        minimumPayment: debt.minimum_payment_amount || 0,
        accountName: debt.account_name || undefined,
    })).filter(debt => debt.balance > 0 && debt.apr > 0);
}
/**
 * Calculate available cash flow for debt payments
 * Income - expenses - minimum payments - safety buffer (20%)
 */
async function calculateAvailableCashFlow(userId) {
    // Get income stability analysis
    const incomeAnalysis = await (0, incomeStability_1.getIncomeStabilityAnalysis)(userId);
    const monthlyIncome = incomeAnalysis.averageIncome || 0;
    // Get savings analysis for expenses
    const savingsAnalysis = await (0, savingsAnalysis_1.getSavingsAnalysis)(userId);
    const monthlyExpenses = savingsAnalysis.monthlyExpenses || 0;
    // Get all minimum payments
    const debts = await getUserDebts(userId);
    const totalMinimumPayments = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
    // Calculate available cash flow
    // Available = Income - Expenses - Minimum Payments - Safety Buffer (20%)
    const availableBeforeBuffer = monthlyIncome - monthlyExpenses - totalMinimumPayments;
    const safetyBuffer = availableBeforeBuffer * 0.2; // 20% safety buffer
    const availableCashFlow = availableBeforeBuffer - safetyBuffer;
    // Ensure non-negative
    return Math.max(0, availableCashFlow);
}
/**
 * Calculate monthly interest for a debt
 */
function calculateMonthlyInterest(balance, apr) {
    const monthlyRate = apr / 100 / 12; // Convert APR to monthly rate
    return balance * monthlyRate;
}
/**
 * Calculate payoff month for a debt
 */
function calculatePayoffMonth(balance, apr, monthlyPayment) {
    let remainingBalance = balance;
    let totalInterest = 0;
    let months = 0;
    const maxMonths = 600; // 50 years max to prevent infinite loops
    while (remainingBalance > 0.01 && months < maxMonths) {
        const interest = calculateMonthlyInterest(remainingBalance, apr);
        totalInterest += interest;
        const principalPayment = Math.min(monthlyPayment - interest, remainingBalance);
        remainingBalance -= principalPayment;
        months++;
    }
    const totalPaid = balance + totalInterest;
    return { months, totalInterest, totalPaid };
}
/**
 * Generate payment plan using avalanche strategy (highest APR first)
 */
async function generateAvalanchePlan(userId, debts, monthlySurplus) {
    // Sort debts by APR descending (highest APR first)
    const sortedDebts = [...debts].sort((a, b) => b.apr - a.apr);
    const debtPayments = [];
    const timeline = [];
    let currentMonth = 0;
    let totalInterest = 0;
    let totalInterestSaved = 0;
    // Calculate total interest if only minimum payments
    const totalMinInterest = sortedDebts.reduce((sum, debt) => {
        const payoff = calculatePayoffMonth(debt.balance, debt.apr, debt.minimumPayment);
        return sum + payoff.totalInterest;
    }, 0);
    // Track remaining balances
    const remainingBalances = new Map();
    sortedDebts.forEach(debt => {
        remainingBalances.set(debt.liabilityId, debt.balance);
    });
    // Process debts in order
    for (const debt of sortedDebts) {
        let remainingBalance = debt.balance;
        let debtInterest = 0;
        let debtTotalPaid = 0;
        let monthsToPayoff = 0;
        let availableSurplus = monthlySurplus;
        // Add surplus from previous debts (once they're paid off)
        const previousDebts = sortedDebts.filter(d => d.apr > debt.apr);
        for (const prevDebt of previousDebts) {
            const prevPayment = debtPayments.find(dp => dp.liabilityId === prevDebt.liabilityId);
            if (prevPayment) {
                // After previous debt is paid off, add its payment to surplus
                const monthsAfterPayoff = currentMonth - prevPayment.payoffMonth;
                if (monthsAfterPayoff > 0) {
                    availableSurplus += prevPayment.monthlyPayment;
                }
            }
        }
        const monthlyPayment = debt.minimumPayment + availableSurplus;
        // Calculate payoff
        while (remainingBalance > 0.01 && monthsToPayoff < 600) {
            const interest = calculateMonthlyInterest(remainingBalance, debt.apr);
            debtInterest += interest;
            const principalPayment = Math.min(monthlyPayment - interest, remainingBalance);
            remainingBalance -= principalPayment;
            debtTotalPaid += monthlyPayment;
            monthsToPayoff++;
            currentMonth++;
            // Update timeline
            if (timeline.length < currentMonth) {
                timeline.push({
                    month: currentMonth,
                    date: new Date(Date.now() + currentMonth * 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 7),
                    totalPayment: 0,
                    debts: [],
                });
            }
            const monthEntry = timeline[currentMonth - 1];
            monthEntry.totalPayment += monthlyPayment;
            monthEntry.debts.push({
                liabilityId: debt.liabilityId,
                payment: monthlyPayment,
                remainingBalance,
            });
            remainingBalances.set(debt.liabilityId, remainingBalance);
        }
        totalInterest += debtInterest;
        debtPayments.push({
            liabilityId: debt.liabilityId,
            accountId: debt.accountId,
            accountName: debt.accountName,
            type: debt.type,
            balance: debt.balance,
            apr: debt.apr,
            monthlyPayment,
            payoffMonth: currentMonth,
            totalInterest: debtInterest,
            totalPaid: debtTotalPaid,
        });
    }
    totalInterestSaved = totalMinInterest - totalInterest;
    const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const payoffMonths = Math.max(...debtPayments.map(dp => dp.payoffMonth));
    return {
        strategy: 'avalanche',
        debts: debtPayments,
        totalDebt,
        totalInterest,
        totalInterestSaved,
        payoffMonths,
        monthlySurplus,
        timeline: timeline.slice(0, payoffMonths),
    };
}
/**
 * Generate payment plan using snowball strategy (smallest balance first)
 */
async function generateSnowballPlan(userId, debts, monthlySurplus) {
    // Sort debts by balance ascending (smallest balance first)
    const sortedDebts = [...debts].sort((a, b) => a.balance - b.balance);
    const debtPayments = [];
    const timeline = [];
    let currentMonth = 0;
    let totalInterest = 0;
    let totalInterestSaved = 0;
    // Calculate total interest if only minimum payments
    const totalMinInterest = sortedDebts.reduce((sum, debt) => {
        const payoff = calculatePayoffMonth(debt.balance, debt.apr, debt.minimumPayment);
        return sum + payoff.totalInterest;
    }, 0);
    // Track remaining balances
    const remainingBalances = new Map();
    sortedDebts.forEach(debt => {
        remainingBalances.set(debt.liabilityId, debt.balance);
    });
    // Process debts in order
    for (const debt of sortedDebts) {
        let remainingBalance = debt.balance;
        let debtInterest = 0;
        let debtTotalPaid = 0;
        let monthsToPayoff = 0;
        let availableSurplus = monthlySurplus;
        // Add surplus from previous debts (once they're paid off)
        const previousDebts = sortedDebts.filter(d => d.balance < debt.balance);
        for (const prevDebt of previousDebts) {
            const prevPayment = debtPayments.find(dp => dp.liabilityId === prevDebt.liabilityId);
            if (prevPayment) {
                // After previous debt is paid off, add its payment to surplus
                const monthsAfterPayoff = currentMonth - prevPayment.payoffMonth;
                if (monthsAfterPayoff > 0) {
                    availableSurplus += prevPayment.monthlyPayment;
                }
            }
        }
        const monthlyPayment = debt.minimumPayment + availableSurplus;
        // Calculate payoff
        while (remainingBalance > 0.01 && monthsToPayoff < 600) {
            const interest = calculateMonthlyInterest(remainingBalance, debt.apr);
            debtInterest += interest;
            const principalPayment = Math.min(monthlyPayment - interest, remainingBalance);
            remainingBalance -= principalPayment;
            debtTotalPaid += monthlyPayment;
            monthsToPayoff++;
            currentMonth++;
            // Update timeline
            if (timeline.length < currentMonth) {
                timeline.push({
                    month: currentMonth,
                    date: new Date(Date.now() + currentMonth * 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 7),
                    totalPayment: 0,
                    debts: [],
                });
            }
            const monthEntry = timeline[currentMonth - 1];
            monthEntry.totalPayment += monthlyPayment;
            monthEntry.debts.push({
                liabilityId: debt.liabilityId,
                payment: monthlyPayment,
                remainingBalance,
            });
            remainingBalances.set(debt.liabilityId, remainingBalance);
        }
        totalInterest += debtInterest;
        debtPayments.push({
            liabilityId: debt.liabilityId,
            accountId: debt.accountId,
            accountName: debt.accountName,
            type: debt.type,
            balance: debt.balance,
            apr: debt.apr,
            monthlyPayment,
            payoffMonth: currentMonth,
            totalInterest: debtInterest,
            totalPaid: debtTotalPaid,
        });
    }
    totalInterestSaved = totalMinInterest - totalInterest;
    const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const payoffMonths = Math.max(...debtPayments.map(dp => dp.payoffMonth));
    return {
        strategy: 'snowball',
        debts: debtPayments,
        totalDebt,
        totalInterest,
        totalInterestSaved,
        payoffMonths,
        monthlySurplus,
        timeline: timeline.slice(0, payoffMonths),
    };
}
/**
 * Generate payment plan for a user
 * @param userId - The user ID
 * @param strategy - 'avalanche' or 'snowball'
 * @returns Payment plan
 */
async function generatePaymentPlan(userId, strategy = 'avalanche') {
    // Get user's debts
    const debts = await getUserDebts(userId);
    if (debts.length === 0) {
        throw new Error('No debts found for user');
    }
    // Calculate available cash flow
    const monthlySurplus = await calculateAvailableCashFlow(userId);
    if (monthlySurplus <= 0) {
        throw new Error('No available cash flow for debt payments');
    }
    // Generate plan based on strategy
    if (strategy === 'avalanche') {
        return await generateAvalanchePlan(userId, debts, monthlySurplus);
    }
    else {
        return await generateSnowballPlan(userId, debts, monthlySurplus);
    }
}
/**
 * Generate both payment plans for comparison
 */
async function generatePaymentPlansComparison(userId) {
    const avalanche = await generatePaymentPlan(userId, 'avalanche');
    const snowball = await generatePaymentPlan(userId, 'snowball');
    return { avalanche, snowball };
}
