"use strict";
// Overarching Message Service
// Generates personalized actionable recommendations for users
// Takes into account existing recommendations and provides a high-level summary
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOverarchingMessage = generateOverarchingMessage;
const assignPersona_1 = require("../personas/assignPersona");
const engine_1 = require("../recommendations/engine");
const db_1 = require("../db/db");
/**
 * Generate overarching message with actionable recommendations
 * @param userId - The user ID
 * @returns Overarching message with actionable items
 */
async function generateOverarchingMessage(userId) {
    try {
        const persona = await (0, assignPersona_1.getCurrentPersona)(userId);
        if (!persona) {
            return {
                message: 'Welcome to FinSight AI! Complete your profile to get personalized recommendations.',
                actionableItems: []
            };
        }
        // Get existing recommendations to inform the overarching message
        let existingRecommendations = [];
        try {
            existingRecommendations = await (0, engine_1.getRecommendations)(userId, 10);
        }
        catch (e) {
            console.error('Error fetching recommendations for overarching message:', e);
        }
        const personaType = persona.persona_type;
        const signals = persona.signals || {};
        const actionableItems = [];
        // Get user's accounts and financial data
        const accounts = await (0, db_1.all)(`SELECT account_id, type, balances 
       FROM accounts 
       WHERE user_id = ?`, [userId]);
        const creditAccounts = accounts.filter(a => a.type === 'credit');
        const savingsAccounts = accounts.filter(a => a.type === 'savings' || a.type === 'checking');
        const loanAccounts = accounts.filter(a => a.type === 'loan');
        // Calculate total credit limit and balance from JSON balances
        let totalCreditLimit = 0;
        let totalCreditBalance = 0;
        creditAccounts.forEach(acc => {
            try {
                const balances = JSON.parse(acc.balances);
                const limit = balances.limit || 0;
                const current = Math.abs(balances.current || 0);
                totalCreditLimit += limit;
                totalCreditBalance += current;
            }
            catch (e) {
                console.error(`Error parsing balances for account ${acc.account_id}:`, e);
            }
        });
        // Get total loan balance
        let totalLoanBalance = 0;
        loanAccounts.forEach(acc => {
            try {
                const balances = JSON.parse(acc.balances);
                const current = Math.abs(balances.current || 0);
                totalLoanBalance += current;
            }
            catch (e) {
                console.error(`Error parsing balances for loan account ${acc.account_id}:`, e);
            }
        });
        // Get total debt (credit balances + loans)
        const totalDebt = totalCreditBalance + totalLoanBalance;
        // Get savings balance
        let totalSavings = 0;
        savingsAccounts.forEach(acc => {
            try {
                const balances = JSON.parse(acc.balances);
                const current = balances.current || 0;
                totalSavings += current;
            }
            catch (e) {
                console.error(`Error parsing balances for savings account ${acc.account_id}:`, e);
            }
        });
        // Get average monthly income (check multiple possible field names)
        const avgMonthlyIncome = signals?.monthlyIncome || signals?.avgMonthlyIncome || signals?.income?.monthlyAverage || 0;
        console.log('OverarchingMessageService: Debug info', {
            userId,
            personaType,
            avgMonthlyIncome,
            totalDebt,
            totalCreditLimit,
            totalCreditBalance,
            totalSavings,
            signalsKeys: Object.keys(signals || {})
        });
        // Generate actionable items based on persona and signals
        if (personaType === 'high_utilization') {
            // High Utilization persona - focus on debt payoff
            if (totalDebt > 0 && avgMonthlyIncome > 0) {
                // Calculate debt payoff plan
                const monthlyPayment = Math.min(totalDebt * 0.05, avgMonthlyIncome * 0.15); // 5% of debt or 15% of income, whichever is lower
                const monthsToPayoff = Math.ceil(totalDebt / monthlyPayment);
                // Build debt breakdown
                const debtBreakdown = [];
                if (totalCreditBalance > 0) {
                    debtBreakdown.push(`$${totalCreditBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in credit card balances`);
                }
                if (totalLoanBalance > 0) {
                    debtBreakdown.push(`$${totalLoanBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in loans`);
                }
                const debtSource = debtBreakdown.length > 0 ? debtBreakdown.join(' and ') : 'debt';
                actionableItems.push({
                    title: 'Create a Debt Payoff Plan',
                    description: `You have ${debtSource}, totaling $${totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. With your monthly income of $${avgMonthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, we recommend paying $${monthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month (${((monthlyPayment / avgMonthlyIncome) * 100).toFixed(1)}% of your income). This will help you pay off your debt in approximately ${monthsToPayoff} months.`,
                    priority: 'high'
                });
            }
            // Credit limit increase if income is higher than credit limit
            if (avgMonthlyIncome > 0 && totalCreditLimit > 0 && avgMonthlyIncome * 3 > totalCreditLimit) {
                const suggestedLimit = Math.round(avgMonthlyIncome * 3);
                actionableItems.push({
                    title: 'Consider Increasing Your Credit Limit',
                    description: `Your income ($${avgMonthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month) suggests you may be eligible for a higher credit limit. Your current total limit is $${totalCreditLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, but you could potentially qualify for up to $${suggestedLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. This can help improve your credit utilization ratio.`,
                    priority: 'medium'
                });
            }
            // Interest charges warning
            const interestCharges = signals?.interestCharges?.monthlyAverage || signals?.interest_charges?.monthlyAverage || 0;
            if (interestCharges > 0) {
                actionableItems.push({
                    title: 'Reduce Interest Charges',
                    description: `You're paying approximately $${interestCharges.toFixed(2)} per month in interest charges. Consider paying more than the minimum payment to reduce these charges and pay off your debt faster.`,
                    priority: 'high'
                });
            }
            // Utilization warning (show if above 30%, not just 50%)
            if (totalCreditLimit > 0) {
                const utilization = (totalCreditBalance / totalCreditLimit) * 100;
                if (utilization > 30) {
                    const priority = utilization > 50 ? 'high' : 'medium';
                    actionableItems.push({
                        title: 'Reduce Credit Card Utilization',
                        description: `Your credit utilization is ${utilization.toFixed(1)}%, which is ${utilization > 50 ? 'well above' : 'above'} the recommended 30%. Focus on paying down balances to improve your credit score${utilization > 50 ? ' and reduce interest charges' : ''}.`,
                        priority
                    });
                }
            }
        }
        if (personaType === 'variable_income') {
            // Variable Income persona - focus on emergency fund
            const avgMonthlyExpenses = signals?.avgMonthlyExpenses || avgMonthlyIncome * 0.8;
            const emergencyFundGoal = avgMonthlyExpenses * 6;
            if (totalSavings < emergencyFundGoal) {
                const shortfall = emergencyFundGoal - totalSavings;
                actionableItems.push({
                    title: 'Build Your Emergency Fund',
                    description: `With variable income, an emergency fund is crucial. Aim for 6 months of expenses ($${emergencyFundGoal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). You currently have $${totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, so you need to save $${shortfall.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more.`,
                    priority: 'high'
                });
            }
        }
        if (personaType === 'subscription_heavy') {
            // Subscription Heavy persona - focus on subscription audit
            const monthlySubscriptions = signals?.subscriptionAnalysis?.monthlyRecurringSpend || 0;
            if (monthlySubscriptions > 0) {
                actionableItems.push({
                    title: 'Audit Your Subscriptions',
                    description: `You're spending $${monthlySubscriptions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month on subscriptions. Review each subscription and cancel any you don't use regularly. This could free up $${(monthlySubscriptions * 0.3).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month if you cancel 30% of them.`,
                    priority: 'high'
                });
            }
        }
        if (personaType === 'savings_builder') {
            // Savings Builder persona - focus on optimization
            const savingsRate = signals?.savingsRate || 0;
            const savingsGrowthRate = signals?.savingsGrowthRate || 0;
            const emergencyFundCoverage = signals?.emergencyFundCoverage || 0;
            const monthlyInflow = signals?.monthlyInflow || 0;
            const totalSavingsBalance = signals?.totalSavingsBalance || 0;
            // Check emergency fund coverage first (most important for savings_builder)
            console.log('Savings Builder Debug:', {
                emergencyFundCoverage,
                savingsRate,
                savingsGrowthRate,
                monthlyInflow,
                totalSavingsBalance,
                condition: emergencyFundCoverage > 0 && emergencyFundCoverage < 6
            });
            if (emergencyFundCoverage > 0 && emergencyFundCoverage < 6) {
                // Emergency fund needs work
                const monthsNeeded = 6 - emergencyFundCoverage;
                const savingsGrowthText = savingsGrowthRate > 0
                    ? `You're growing your savings at ${savingsGrowthRate.toFixed(1)}%`
                    : savingsRate > 0
                        ? `You're saving ${(savingsRate * 100).toFixed(1)}% of your income`
                        : monthlyInflow > 0
                            ? `You're adding $${monthlyInflow.toFixed(2)} per month to savings`
                            : 'You have a strong savings habit';
                actionableItems.push({
                    title: 'Build Your Emergency Fund',
                    description: `${savingsGrowthText}. Now focus on building your emergency fund. You currently have ${emergencyFundCoverage.toFixed(1)} months of coverage ($${totalSavingsBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Aim for 6 months to fully protect yourself from unexpected expenses.`,
                    priority: 'high'
                });
                console.log('Added emergency fund actionable item');
            }
            else if (savingsRate < 20 && avgMonthlyIncome > 0) {
                // Low savings rate
                const targetSavings = avgMonthlyIncome * 0.2;
                actionableItems.push({
                    title: 'Increase Your Savings Rate',
                    description: `You're currently saving ${(savingsRate * 100).toFixed(1)}% of your income. Aim to save at least 20% ($${targetSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month) to build wealth faster.`,
                    priority: 'medium'
                });
            }
            else if ((savingsRate >= 20 || savingsGrowthRate > 15) && emergencyFundCoverage >= 6) {
                // Doing well - suggest optimization
                const savingsText = savingsRate > 0
                    ? `saving ${(savingsRate * 100).toFixed(1)}% of your income`
                    : savingsGrowthRate > 0
                        ? `growing your savings at ${savingsGrowthRate.toFixed(1)}%`
                        : 'maintaining strong savings';
                actionableItems.push({
                    title: 'Optimize Your Savings Strategy',
                    description: `Excellent work! You're ${savingsText} and have ${emergencyFundCoverage.toFixed(1)} months of emergency coverage. Consider exploring investment options to grow your wealth beyond savings accounts.`,
                    priority: 'low'
                });
            }
            else if (savingsGrowthRate > 0 && emergencyFundCoverage >= 6) {
                // Good growth and emergency fund - suggest optimization
                actionableItems.push({
                    title: 'Optimize Your Savings Strategy',
                    description: `Excellent work! You're growing your savings at ${savingsGrowthRate.toFixed(1)}% and have ${emergencyFundCoverage.toFixed(1)} months of emergency coverage. Consider exploring investment options to grow your wealth beyond savings accounts.`,
                    priority: 'low'
                });
            }
            // Check for secondary personas that might need attention
            const secondaryPersonas = persona.secondary_personas || [];
            if (secondaryPersonas.includes('high_utilization') && totalCreditBalance > 0) {
                const utilization = totalCreditLimit > 0 ? (totalCreditBalance / totalCreditLimit) * 100 : 0;
                if (utilization > 30) {
                    actionableItems.push({
                        title: 'Address Credit Card Utilization',
                        description: `While you're doing great with savings, your credit card utilization is ${utilization.toFixed(1)}%. Consider paying down your $${totalCreditBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} balance to improve your credit score.`,
                        priority: 'medium'
                    });
                }
            }
            if (secondaryPersonas.includes('subscription_heavy')) {
                const monthlySubscriptions = signals?.monthlyRecurringSpend || 0;
                if (monthlySubscriptions > 0) {
                    actionableItems.push({
                        title: 'Review Your Subscriptions',
                        description: `You're spending $${monthlySubscriptions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month on subscriptions. Review and cancel any you don't use to free up more money for savings.`,
                        priority: 'low'
                    });
                }
            }
        }
        if (personaType === 'lifestyle_creep') {
            // Lifestyle Creep persona - focus on savings alignment
            const savingsRate = signals?.savingsRate || 0;
            if (savingsRate < 10 && avgMonthlyIncome > 0) {
                const targetSavings = avgMonthlyIncome * 0.15;
                actionableItems.push({
                    title: 'Align Savings with Income',
                    description: `Your income is high, but your savings rate is only ${(savingsRate * 100).toFixed(1)}%. Aim to save at least 15% of your income ($${targetSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month) to build long-term wealth.`,
                    priority: 'high'
                });
            }
        }
        // Generate main message based on persona and existing recommendations
        let message = '';
        // If we have existing recommendations, reference them in the message
        if (existingRecommendations.length > 0) {
            const highPriorityRecs = existingRecommendations.filter((r) => r.rationale?.toLowerCase().includes('urgent') ||
                r.rationale?.toLowerCase().includes('important') ||
                r.type === 'partner_offer');
            if (actionableItems.length === 0) {
                // No specific actionable items, but we have recommendations
                message = `Based on your financial profile, we've identified ${existingRecommendations.length} personalized recommendation${existingRecommendations.length > 1 ? 's' : ''} below. Review them to optimize your financial health.`;
            }
            else {
                const highPriorityItems = actionableItems.filter(item => item.priority === 'high');
                if (highPriorityItems.length > 0) {
                    message = `Focus on these ${highPriorityItems.length} priority action${highPriorityItems.length > 1 ? 's' : ''} to improve your financial health. We also have ${existingRecommendations.length} detailed recommendation${existingRecommendations.length > 1 ? 's' : ''} below:`;
                }
                else {
                    message = `Here are some key actions to optimize your finances. See the ${existingRecommendations.length} detailed recommendation${existingRecommendations.length > 1 ? 's' : ''} below for more specific guidance:`;
                }
            }
        }
        else {
            // No recommendations yet, use original logic
            if (actionableItems.length === 0) {
                message = `You're on the right track! Keep monitoring your financial health and continue following your current plan.`;
            }
            else {
                const highPriorityItems = actionableItems.filter(item => item.priority === 'high');
                if (highPriorityItems.length > 0) {
                    message = `Focus on these ${highPriorityItems.length} priority action${highPriorityItems.length > 1 ? 's' : ''} to improve your financial health:`;
                }
                else {
                    message = `Here are some recommendations to optimize your finances:`;
                }
            }
        }
        return {
            message,
            actionableItems: actionableItems.slice(0, 3) // Limit to top 3 items
        };
    }
    catch (error) {
        console.error('Error in generateOverarchingMessage:', error);
        // Return a safe fallback message
        return {
            message: 'Welcome to FinSight AI! We\'re analyzing your financial data to provide personalized recommendations.',
            actionableItems: []
        };
    }
}
