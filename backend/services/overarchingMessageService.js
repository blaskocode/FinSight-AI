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
 *
 * CRITICAL GUARANTEE: This function ALWAYS returns:
 * - A non-empty message string
 * - At least one actionable item in the actionableItems array
 *
 * Multiple fallback layers ensure this:
 * 1. Persona-specific logic generates items based on signals
 * 2. Persona-specific fallback before message generation (if no items)
 * 3. Final safety check after message generation (if still no items)
 * 4. Error handler always returns message + actionable item
 *
 * @param userId - The user ID
 * @returns Overarching message with actionable items (guaranteed to have at least one item)
 */
async function generateOverarchingMessage(userId) {
    try {
        const persona = await (0, assignPersona_1.getCurrentPersona)(userId);
        if (!persona) {
            console.warn('OverarchingMessageService: No persona found, returning welcome message');
            return {
                message: 'Welcome to FinSight AI! Complete your profile to get personalized recommendations.',
                actionableItems: [{
                        title: 'Complete Your Profile',
                        description: 'Provide your financial information to receive personalized recommendations and insights.',
                        priority: 'medium'
                    }]
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
        console.log('OverarchingMessageService: Starting generation', {
            userId,
            personaType,
            signalsKeys: Object.keys(signals),
            signalsSample: JSON.stringify(signals).substring(0, 200)
        });
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
            signalsKeys: Object.keys(signals || {}),
            subscriptionSignals: {
                monthlyRecurringSpend: signals?.monthlyRecurringSpend,
                recurringMerchants: signals?.recurringMerchants,
                subscriptionShare: signals?.subscriptionShare,
                subscriptionCount: signals?.subscriptionCount
            }
        });
        // Generate actionable items based on persona and signals
        if (personaType === 'high_utilization') {
            // High Utilization persona - focus on debt payoff
            // CRITICAL: This persona MUST ALWAYS get a debt/utilization-specific actionable item
            console.log('OverarchingMessageService: High Utilization persona detected - FORCING debt/utilization item', {
                userId,
                totalDebt,
                totalCreditBalance,
                totalCreditLimit,
                avgMonthlyIncome,
                signalsKeys: Object.keys(signals || {})
            });
            // CRITICAL: Remove any non-debt/utilization items that might have been added before this block
            // For high_utilization, we ONLY want debt/utilization-related items
            const nonDebtItems = actionableItems.filter(item => !item.title.toLowerCase().includes('debt') &&
                !item.title.toLowerCase().includes('utilization') &&
                !item.title.toLowerCase().includes('credit') &&
                !item.title.toLowerCase().includes('interest') &&
                !item.title.toLowerCase().includes('payoff'));
            actionableItems.length = 0; // Clear array
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
            // CRITICAL SAFEGUARD: Ensure high_utilization ALWAYS has at least one item
            const debtItems = actionableItems.filter(item => item.title.toLowerCase().includes('debt') ||
                item.title.toLowerCase().includes('utilization') ||
                item.title.toLowerCase().includes('credit') ||
                item.title.toLowerCase().includes('interest') ||
                item.title.toLowerCase().includes('payoff'));
            if (debtItems.length === 0) {
                console.error('OverarchingMessageService: CRITICAL - high_utilization block did not add any items, forcing fallback', {
                    userId,
                    totalDebt,
                    totalCreditBalance,
                    totalCreditLimit
                });
                actionableItems.push({
                    title: 'Monitor Your Credit Utilization',
                    description: `Keep your credit card balances low and make payments on time. Aim to keep utilization below 30% to improve your credit score.`,
                    priority: 'high'
                });
            }
            console.log(`OverarchingMessageService: high_utilization block complete, debt items: ${debtItems.length}, total actionableItems: ${actionableItems.length}`);
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
            else {
                // ABSOLUTE FALLBACK: Even with no signal data, variable_income MUST get emergency fund advice
                actionableItems.push({
                    title: 'Build Your Emergency Fund',
                    description: `With variable income, having a robust emergency fund is essential. Aim for 3-6 months of expenses to protect against income fluctuations.`,
                    priority: 'high'
                });
                console.log('OverarchingMessageService: Added generic emergency fund item (no signal data) - FORCED for variable_income');
            }
            // CRITICAL SAFEGUARD: Verify we have an emergency fund item
            const emergencyItems = actionableItems.filter(item => item.title.toLowerCase().includes('emergency') ||
                item.title.toLowerCase().includes('fund') ||
                item.title.toLowerCase().includes('buffer'));
            if (emergencyItems.length === 0) {
                console.error('OverarchingMessageService: CRITICAL ERROR - variable_income block failed to add emergency fund item!', {
                    userId,
                    totalSavings,
                    avgMonthlyIncome
                });
                actionableItems.push({
                    title: 'Build Your Emergency Fund',
                    description: `With variable income, having a robust emergency fund is essential. Aim for 3-6 months of expenses to protect against income fluctuations.`,
                    priority: 'high'
                });
                console.error('OverarchingMessageService: FORCED emergency fund item as emergency fallback');
            }
            console.log(`OverarchingMessageService: variable_income block complete, emergency items: ${emergencyItems.length}, total actionableItems: ${actionableItems.length}`);
        }
        if (personaType === 'subscription_heavy') {
            // Subscription Heavy persona - focus on subscription audit
            // CRITICAL: This persona MUST ALWAYS get a subscription-specific actionable item
            // Signals are stored directly, not nested under subscriptionAnalysis
            const monthlySubscriptions = signals?.monthlyRecurringSpend || signals?.subscriptionAnalysis?.monthlyRecurringSpend || 0;
            const subscriptionCount = signals?.recurringMerchants || signals?.subscriptionCount || 0;
            const subscriptionShare = signals?.subscriptionShare || 0;
            console.log('OverarchingMessageService: Subscription Heavy persona detected - FORCING subscription item', {
                userId,
                monthlySubscriptions,
                subscriptionCount,
                subscriptionShare,
                signalsKeys: Object.keys(signals || {}),
                fullSignals: JSON.stringify(signals).substring(0, 500)
            });
            // CRITICAL: Remove any non-subscription items that might have been added before this block
            // For subscription_heavy, we ONLY want subscription-related items
            const nonSubscriptionItems = actionableItems.filter(item => !item.title.toLowerCase().includes('subscription') &&
                !item.title.toLowerCase().includes('audit'));
            actionableItems.length = 0; // Clear array
            // We'll add subscription item below, so we don't need to restore non-subscription items
            // ALWAYS generate a subscription-specific actionable item for subscription_heavy persona
            // This is NON-NEGOTIABLE - subscription_heavy users MUST get subscription advice
            if (monthlySubscriptions > 0) {
                const potentialSavings = monthlySubscriptions * 0.3;
                actionableItems.push({
                    title: 'Audit Your Subscriptions',
                    description: `You're spending $${monthlySubscriptions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month on ${subscriptionCount > 0 ? `${subscriptionCount} subscription${subscriptionCount > 1 ? 's' : ''}` : 'subscriptions'}. Review each subscription and cancel any you don't use regularly. This could free up $${potentialSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month if you cancel 30% of them.`,
                    priority: 'high'
                });
                console.log('OverarchingMessageService: Added subscription audit item with spend data');
            }
            else if (subscriptionCount > 0 || subscriptionShare > 0) {
                // Fallback: if we have subscription count or share but not exact spend
                actionableItems.push({
                    title: 'Review Your Subscriptions',
                    description: `You have ${subscriptionCount > 0 ? `${subscriptionCount} active subscription${subscriptionCount > 1 ? 's' : ''}` : 'multiple subscriptions'}${subscriptionShare > 0 ? `, making up ${subscriptionShare.toFixed(1)}% of your spending` : ''}. Take time to review each subscription and cancel any you don't use regularly. This can help reduce your monthly expenses and free up money for savings or other financial goals.`,
                    priority: 'high'
                });
                console.log('OverarchingMessageService: Added subscription review item with count/share data');
            }
            else {
                // ABSOLUTE FALLBACK: Even with no signal data, subscription_heavy MUST get subscription advice
                // This persona was assigned because they have subscriptions, so we know they exist
                actionableItems.push({
                    title: 'Review and Cancel Unused Subscriptions',
                    description: `As someone with multiple subscriptions, regularly reviewing and canceling unused services can help reduce your monthly expenses. Take time to audit your subscriptions and identify opportunities to eliminate unnecessary costs. This can free up money for savings or other financial goals.`,
                    priority: 'high'
                });
                console.log('OverarchingMessageService: Added generic subscription review item (no signal data) - FORCED for subscription_heavy');
            }
            // CRITICAL SAFEGUARD: Verify we have a subscription item
            const subscriptionItems = actionableItems.filter(item => item.title.toLowerCase().includes('subscription') ||
                item.title.toLowerCase().includes('audit') ||
                item.title.toLowerCase().includes('cancel'));
            if (subscriptionItems.length === 0) {
                console.error('OverarchingMessageService: CRITICAL ERROR - subscription_heavy block failed to add subscription item!', {
                    userId,
                    monthlySubscriptions,
                    subscriptionCount,
                    subscriptionShare,
                    actionableItemsCount: actionableItems.length
                });
                // FORCE add subscription item - this should NEVER happen but is a final safeguard
                actionableItems.push({
                    title: 'Review Your Subscriptions',
                    description: `You have multiple subscriptions. Regularly review each one and cancel any you don't use regularly. This can help reduce your monthly expenses and free up money for savings or other financial goals.`,
                    priority: 'high'
                });
                console.error('OverarchingMessageService: FORCED subscription item as emergency fallback');
            }
            console.log(`OverarchingMessageService: subscription_heavy block complete, subscription items: ${subscriptionItems.length}, total actionableItems: ${actionableItems.length}`);
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
            // CRITICAL SAFEGUARD: Ensure savings_builder ALWAYS has at least one item
            const savingsItems = actionableItems.filter(item => item.title.toLowerCase().includes('savings') ||
                item.title.toLowerCase().includes('emergency') ||
                item.title.toLowerCase().includes('fund') ||
                item.title.toLowerCase().includes('optimize') ||
                item.title.toLowerCase().includes('investment'));
            if (savingsItems.length === 0) {
                console.error('OverarchingMessageService: CRITICAL - savings_builder block did not add any items, forcing fallback', {
                    userId,
                    savingsRate,
                    savingsGrowthRate,
                    emergencyFundCoverage
                });
                actionableItems.push({
                    title: 'Continue Building Your Savings',
                    description: `You're doing great with savings! Consider setting specific savings goals and exploring ways to optimize your savings growth, such as high-yield savings accounts.`,
                    priority: 'medium'
                });
            }
            console.log(`OverarchingMessageService: savings_builder block complete, savings items: ${savingsItems.length}, total actionableItems: ${actionableItems.length}`);
        }
        if (personaType === 'lifestyle_creep') {
            // Lifestyle Creep persona - focus on savings alignment
            // CRITICAL: This persona MUST ALWAYS get a savings alignment-specific actionable item
            console.log('OverarchingMessageService: Lifestyle Creep persona detected - FORCING savings alignment item', {
                userId,
                savingsRate: signals?.savingsRate,
                avgMonthlyIncome,
                signalsKeys: Object.keys(signals || {})
            });
            // CRITICAL: Remove any non-savings alignment items that might have been added before this block
            const nonSavingsItems = actionableItems.filter(item => !item.title.toLowerCase().includes('savings') &&
                !item.title.toLowerCase().includes('align') &&
                !item.title.toLowerCase().includes('income') &&
                !item.title.toLowerCase().includes('wealth'));
            actionableItems.length = 0; // Clear array
            const savingsRate = signals?.savingsRate || 0;
            if (savingsRate < 10 && avgMonthlyIncome > 0) {
                const targetSavings = avgMonthlyIncome * 0.15;
                actionableItems.push({
                    title: 'Align Savings with Income',
                    description: `Your income is high, but your savings rate is only ${(savingsRate * 100).toFixed(1)}%. Aim to save at least 15% of your income ($${targetSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per month) to build long-term wealth.`,
                    priority: 'high'
                });
            }
            else {
                // ABSOLUTE FALLBACK: Even with no signal data, lifestyle_creep MUST get savings alignment advice
                actionableItems.push({
                    title: 'Align Savings with Income',
                    description: `You have strong income. Consider increasing your savings rate to build long-term wealth. Aim to save at least 15-20% of your income.`,
                    priority: 'high'
                });
                console.log('OverarchingMessageService: Added generic savings alignment item (no signal data) - FORCED for lifestyle_creep');
            }
            // CRITICAL SAFEGUARD: Verify we have a savings alignment item
            const savingsItems = actionableItems.filter(item => item.title.toLowerCase().includes('savings') ||
                item.title.toLowerCase().includes('align') ||
                item.title.toLowerCase().includes('income') ||
                item.title.toLowerCase().includes('wealth'));
            if (savingsItems.length === 0) {
                console.error('OverarchingMessageService: CRITICAL ERROR - lifestyle_creep block failed to add savings alignment item!', {
                    userId,
                    savingsRate,
                    avgMonthlyIncome
                });
                actionableItems.push({
                    title: 'Align Savings with Income',
                    description: `You have strong income. Consider increasing your savings rate to build long-term wealth. Aim to save at least 15-20% of your income.`,
                    priority: 'high'
                });
                console.error('OverarchingMessageService: FORCED savings alignment item as emergency fallback');
            }
            console.log(`OverarchingMessageService: lifestyle_creep block complete, savings items: ${savingsItems.length}, total actionableItems: ${actionableItems.length}`);
        }
        // CRITICAL: Ensure we ALWAYS have at least one actionable item BEFORE generating message
        // This must happen BEFORE message generation so the message can reference the items
        // SPECIAL CASE: subscription_heavy should NEVER reach this fallback - they should have items from their block above
        if (actionableItems.length === 0) {
            console.warn('OverarchingMessageService: No actionable items before message generation, creating fallback', {
                userId,
                personaType,
                signalsKeys: Object.keys(signals || {})
            });
            // CRITICAL: For each persona, this should NEVER happen, but if it does, force persona-specific item
            if (personaType === 'subscription_heavy') {
                console.error('OverarchingMessageService: CRITICAL - subscription_heavy reached fallback check! This should never happen!');
                actionableItems.push({
                    title: 'Review and Cancel Unused Subscriptions',
                    description: `You have multiple subscriptions. Regularly review each one and cancel any you don't use regularly. This can help reduce your monthly expenses and free up money for savings or other financial goals.`,
                    priority: 'high'
                });
                console.error('OverarchingMessageService: FORCED subscription item in fallback check for subscription_heavy');
            }
            else if (personaType === 'high_utilization') {
                console.error('OverarchingMessageService: CRITICAL - high_utilization reached fallback check! This should never happen!');
                actionableItems.push({
                    title: 'Monitor Your Credit Utilization',
                    description: `Keep your credit card balances low and make payments on time. Aim to keep utilization below 30% to improve your credit score.`,
                    priority: 'high'
                });
                console.error('OverarchingMessageService: FORCED debt/utilization item in fallback check for high_utilization');
            }
            else if (personaType === 'variable_income') {
                console.error('OverarchingMessageService: CRITICAL - variable_income reached fallback check! This should never happen!');
                actionableItems.push({
                    title: 'Build Your Emergency Fund',
                    description: `With variable income, having a robust emergency fund is essential. Aim for 3-6 months of expenses to protect against income fluctuations.`,
                    priority: 'high'
                });
                console.error('OverarchingMessageService: FORCED emergency fund item in fallback check for variable_income');
            }
            else if (personaType === 'savings_builder') {
                console.error('OverarchingMessageService: CRITICAL - savings_builder reached fallback check! This should never happen!');
                actionableItems.push({
                    title: 'Continue Building Your Savings',
                    description: `You're doing great with savings! Consider setting specific savings goals and exploring ways to optimize your savings growth, such as high-yield savings accounts.`,
                    priority: 'medium'
                });
                console.error('OverarchingMessageService: FORCED savings item in fallback check for savings_builder');
            }
            else if (personaType === 'lifestyle_creep') {
                console.error('OverarchingMessageService: CRITICAL - lifestyle_creep reached fallback check! This should never happen!');
                actionableItems.push({
                    title: 'Align Savings with Income',
                    description: `You have strong income. Consider increasing your savings rate to build long-term wealth. Aim to save at least 15-20% of your income.`,
                    priority: 'high'
                });
                console.error('OverarchingMessageService: FORCED savings alignment item in fallback check for lifestyle_creep');
            }
            else {
                const fallbackItems = {
                    'high_utilization': {
                        title: 'Monitor Your Credit Utilization',
                        description: `Keep your credit card balances low and make payments on time. Aim to keep utilization below 30% to improve your credit score.`,
                        priority: 'high'
                    },
                    'variable_income': {
                        title: 'Build Your Emergency Fund',
                        description: `With variable income, having a robust emergency fund is essential. Aim for 3-6 months of expenses to protect against income fluctuations.`,
                        priority: 'high'
                    },
                    'savings_builder': {
                        title: 'Continue Building Your Savings',
                        description: `You're doing great with savings! Consider setting specific savings goals and exploring ways to optimize your savings growth, such as high-yield savings accounts.`,
                        priority: 'medium'
                    },
                    'lifestyle_creep': {
                        title: 'Align Savings with Income',
                        description: `You have strong income. Consider increasing your savings rate to build long-term wealth. Aim to save at least 15-20% of your income.`,
                        priority: 'high'
                    }
                };
                if (fallbackItems[personaType]) {
                    actionableItems.push(fallbackItems[personaType]);
                    console.log(`OverarchingMessageService: Added fallback item for ${personaType} BEFORE message generation`);
                }
                else {
                    // Generic fallback if persona type is unknown
                    actionableItems.push({
                        title: 'Optimize Your Financial Health',
                        description: `Continue monitoring your financial situation and take steps to improve your financial well-being. Review your spending, savings, and financial goals regularly.`,
                        priority: 'medium'
                    });
                    console.log('OverarchingMessageService: Added generic fallback item BEFORE message generation');
                }
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
                // Generate a persona-specific encouraging message even when no actionable items
                const personaMessages = {
                    'high_utilization': `Your credit utilization is being monitored. Continue making on-time payments and consider paying more than the minimum to reduce interest charges.`,
                    'variable_income': `You're managing variable income well. Keep building your emergency fund to protect against income fluctuations.`,
                    'subscription_heavy': `You have multiple subscriptions. Regularly review them to ensure you're getting value from each one.`,
                    'savings_builder': `Great job building your savings! Continue your current strategy and consider exploring ways to optimize your savings growth.`,
                    'lifestyle_creep': `You have strong income. Consider aligning your savings rate with your earning potential to build long-term wealth.`
                };
                message = personaMessages[personaType] || `You're on the right track! Keep monitoring your financial health and continue following your current plan.`;
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
        // Debug: Log message generation
        console.log('OverarchingMessageService: Message generation result', {
            userId,
            personaType,
            hasRecommendations: existingRecommendations.length > 0,
            actionableItemsCount: actionableItems.length,
            messageGenerated: !!message,
            messageLength: message?.length || 0
        });
        // FINAL SAFETY CHECK: If somehow we still have no actionable items, force add one
        // This should never happen due to the check before message generation, but it's a final safeguard
        // CRITICAL: For subscription_heavy, verify we have a subscription item, not just any item
        if (actionableItems.length === 0) {
            console.error('OverarchingMessageService: CRITICAL - No actionable items after all logic, forcing fallback', {
                userId,
                personaType,
                signalsKeys: Object.keys(signals || {})
            });
            // CRITICAL: Each persona MUST get persona-specific item
            if (personaType === 'subscription_heavy') {
                console.error('OverarchingMessageService: CRITICAL ERROR - subscription_heavy has no items in final check!');
                actionableItems.push({
                    title: 'Review and Cancel Unused Subscriptions',
                    description: `You have multiple subscriptions. Regularly review each one and cancel any you don't use regularly. This can help reduce your monthly expenses and free up money for savings or other financial goals.`,
                    priority: 'high'
                });
                console.error('OverarchingMessageService: FORCED subscription item in final safety check');
            }
            else if (personaType === 'high_utilization') {
                console.error('OverarchingMessageService: CRITICAL ERROR - high_utilization has no items in final check!');
                actionableItems.push({
                    title: 'Monitor Your Credit Utilization',
                    description: `Keep your credit card balances low and make payments on time. Aim to keep utilization below 30% to improve your credit score.`,
                    priority: 'high'
                });
                console.error('OverarchingMessageService: FORCED debt/utilization item in final safety check');
            }
            else if (personaType === 'variable_income') {
                console.error('OverarchingMessageService: CRITICAL ERROR - variable_income has no items in final check!');
                actionableItems.push({
                    title: 'Build Your Emergency Fund',
                    description: `With variable income, having a robust emergency fund is essential. Aim for 3-6 months of expenses to protect against income fluctuations.`,
                    priority: 'high'
                });
                console.error('OverarchingMessageService: FORCED emergency fund item in final safety check');
            }
            else if (personaType === 'savings_builder') {
                console.error('OverarchingMessageService: CRITICAL ERROR - savings_builder has no items in final check!');
                actionableItems.push({
                    title: 'Continue Building Your Savings',
                    description: `You're doing great with savings! Consider setting specific savings goals and exploring ways to optimize your savings growth, such as high-yield savings accounts.`,
                    priority: 'medium'
                });
                console.error('OverarchingMessageService: FORCED savings item in final safety check');
            }
            else if (personaType === 'lifestyle_creep') {
                console.error('OverarchingMessageService: CRITICAL ERROR - lifestyle_creep has no items in final check!');
                actionableItems.push({
                    title: 'Align Savings with Income',
                    description: `You have strong income. Consider increasing your savings rate to build long-term wealth. Aim to save at least 15-20% of your income.`,
                    priority: 'high'
                });
                console.error('OverarchingMessageService: FORCED savings alignment item in final safety check');
            }
            else {
                const emergencyFallback = {
                    'high_utilization': {
                        title: 'Monitor Your Credit Utilization',
                        description: `Keep your credit card balances low and make payments on time. Aim to keep utilization below 30% to improve your credit score.`,
                        priority: 'high'
                    },
                    'variable_income': {
                        title: 'Build Your Emergency Fund',
                        description: `With variable income, having a robust emergency fund is essential. Aim for 3-6 months of expenses to protect against income fluctuations.`,
                        priority: 'high'
                    },
                    'savings_builder': {
                        title: 'Continue Building Your Savings',
                        description: `You're doing great with savings! Consider setting specific savings goals and exploring ways to optimize your savings growth, such as high-yield savings accounts.`,
                        priority: 'medium'
                    },
                    'lifestyle_creep': {
                        title: 'Align Savings with Income',
                        description: `You have strong income. Consider increasing your savings rate to build long-term wealth. Aim to save at least 15-20% of your income.`,
                        priority: 'high'
                    }
                };
                if (emergencyFallback[personaType]) {
                    actionableItems.push(emergencyFallback[personaType]);
                    console.error(`OverarchingMessageService: EMERGENCY - Added fallback item for ${personaType} as final safeguard`);
                }
                else {
                    // Generic fallback if persona type is unknown
                    actionableItems.push({
                        title: 'Optimize Your Financial Health',
                        description: `Continue monitoring your financial situation and take steps to improve your financial well-being. Review your spending, savings, and financial goals regularly.`,
                        priority: 'medium'
                    });
                    console.error('OverarchingMessageService: EMERGENCY - Added generic fallback item as final safeguard');
                }
            }
        }
        else {
            // CRITICAL: Even if we have items, verify each persona has persona-specific items
            if (personaType === 'subscription_heavy') {
                const hasSubscriptionItem = actionableItems.some(item => item.title.toLowerCase().includes('subscription') ||
                    item.title.toLowerCase().includes('audit') ||
                    item.title.toLowerCase().includes('cancel'));
                if (!hasSubscriptionItem) {
                    console.error('OverarchingMessageService: CRITICAL - subscription_heavy has items but none are subscription-related!', {
                        userId,
                        itemTitles: actionableItems.map(item => item.title)
                    });
                    actionableItems.length = 0;
                    actionableItems.push({
                        title: 'Review and Cancel Unused Subscriptions',
                        description: `You have multiple subscriptions. Regularly review each one and cancel any you don't use regularly. This can help reduce your monthly expenses and free up money for savings or other financial goals.`,
                        priority: 'high'
                    });
                    console.error('OverarchingMessageService: REPLACED items with subscription item for subscription_heavy');
                }
            }
            else if (personaType === 'high_utilization') {
                const hasDebtItem = actionableItems.some(item => item.title.toLowerCase().includes('debt') ||
                    item.title.toLowerCase().includes('utilization') ||
                    item.title.toLowerCase().includes('credit') ||
                    item.title.toLowerCase().includes('interest') ||
                    item.title.toLowerCase().includes('payoff'));
                if (!hasDebtItem) {
                    console.error('OverarchingMessageService: CRITICAL - high_utilization has items but none are debt/utilization-related!', {
                        userId,
                        itemTitles: actionableItems.map(item => item.title)
                    });
                    actionableItems.length = 0;
                    actionableItems.push({
                        title: 'Monitor Your Credit Utilization',
                        description: `Keep your credit card balances low and make payments on time. Aim to keep utilization below 30% to improve your credit score.`,
                        priority: 'high'
                    });
                    console.error('OverarchingMessageService: REPLACED items with debt/utilization item for high_utilization');
                }
            }
            else if (personaType === 'variable_income') {
                const hasEmergencyItem = actionableItems.some(item => item.title.toLowerCase().includes('emergency') ||
                    item.title.toLowerCase().includes('fund') ||
                    item.title.toLowerCase().includes('buffer'));
                if (!hasEmergencyItem) {
                    console.error('OverarchingMessageService: CRITICAL - variable_income has items but none are emergency fund-related!', {
                        userId,
                        itemTitles: actionableItems.map(item => item.title)
                    });
                    actionableItems.length = 0;
                    actionableItems.push({
                        title: 'Build Your Emergency Fund',
                        description: `With variable income, having a robust emergency fund is essential. Aim for 3-6 months of expenses to protect against income fluctuations.`,
                        priority: 'high'
                    });
                    console.error('OverarchingMessageService: REPLACED items with emergency fund item for variable_income');
                }
            }
            else if (personaType === 'savings_builder') {
                const hasSavingsItem = actionableItems.some(item => item.title.toLowerCase().includes('savings') ||
                    item.title.toLowerCase().includes('emergency') ||
                    item.title.toLowerCase().includes('fund') ||
                    item.title.toLowerCase().includes('optimize') ||
                    item.title.toLowerCase().includes('investment'));
                if (!hasSavingsItem) {
                    console.error('OverarchingMessageService: CRITICAL - savings_builder has items but none are savings-related!', {
                        userId,
                        itemTitles: actionableItems.map(item => item.title)
                    });
                    actionableItems.length = 0;
                    actionableItems.push({
                        title: 'Continue Building Your Savings',
                        description: `You're doing great with savings! Consider setting specific savings goals and exploring ways to optimize your savings growth, such as high-yield savings accounts.`,
                        priority: 'medium'
                    });
                    console.error('OverarchingMessageService: REPLACED items with savings item for savings_builder');
                }
            }
            else if (personaType === 'lifestyle_creep') {
                const hasSavingsItem = actionableItems.some(item => item.title.toLowerCase().includes('savings') ||
                    item.title.toLowerCase().includes('align') ||
                    item.title.toLowerCase().includes('income') ||
                    item.title.toLowerCase().includes('wealth'));
                if (!hasSavingsItem) {
                    console.error('OverarchingMessageService: CRITICAL - lifestyle_creep has items but none are savings alignment-related!', {
                        userId,
                        itemTitles: actionableItems.map(item => item.title)
                    });
                    actionableItems.length = 0;
                    actionableItems.push({
                        title: 'Align Savings with Income',
                        description: `You have strong income. Consider increasing your savings rate to build long-term wealth. Aim to save at least 15-20% of your income.`,
                        priority: 'high'
                    });
                    console.error('OverarchingMessageService: REPLACED items with savings alignment item for lifestyle_creep');
                }
            }
        }
        // Ensure we always have a message
        if (!message || message.trim() === '') {
            console.warn('OverarchingMessageService: No message generated, using fallback');
            if (actionableItems.length > 0) {
                const highPriorityItems = actionableItems.filter(item => item.priority === 'high');
                if (highPriorityItems.length > 0) {
                    message = `Focus on these ${highPriorityItems.length} priority action${highPriorityItems.length > 1 ? 's' : ''} to improve your financial health:`;
                }
                else {
                    message = `Here are some recommendations to optimize your finances:`;
                }
            }
            else {
                message = `Welcome to FinSight AI! We're analyzing your financial data to provide personalized recommendations.`;
            }
        }
        // CRITICAL FINAL CHECK: Ensure we ALWAYS have at least one actionable item before returning
        // This is the absolute last safeguard before returning the response
        // CRITICAL: For subscription_heavy, verify we have subscription-specific item
        if (actionableItems.length === 0) {
            console.error('OverarchingMessageService: CRITICAL FINAL CHECK - Still no actionable items!', {
                userId,
                personaType,
                messageLength: message.length
            });
            // CRITICAL: subscription_heavy MUST get subscription-specific item
            if (personaType === 'subscription_heavy') {
                console.error('OverarchingMessageService: CRITICAL FINAL CHECK - subscription_heavy has no items!');
                actionableItems.push({
                    title: 'Review and Cancel Unused Subscriptions',
                    description: `You have multiple subscriptions. Regularly review each one and cancel any you don't use regularly. This can help reduce your monthly expenses and free up money for savings or other financial goals.`,
                    priority: 'high'
                });
                console.error('OverarchingMessageService: FINAL EMERGENCY - FORCED subscription item for subscription_heavy');
            }
            else {
                const finalEmergencyFallback = {
                    'high_utilization': {
                        title: 'Monitor Your Credit Utilization',
                        description: `Keep your credit card balances low and make payments on time. Aim to keep utilization below 30% to improve your credit score.`,
                        priority: 'high'
                    },
                    'variable_income': {
                        title: 'Build Your Emergency Fund',
                        description: `With variable income, having a robust emergency fund is essential. Aim for 3-6 months of expenses to protect against income fluctuations.`,
                        priority: 'high'
                    },
                    'savings_builder': {
                        title: 'Continue Building Your Savings',
                        description: `You're doing great with savings! Consider setting specific savings goals and exploring ways to optimize your savings growth, such as high-yield savings accounts.`,
                        priority: 'medium'
                    },
                    'lifestyle_creep': {
                        title: 'Align Savings with Income',
                        description: `You have strong income. Consider increasing your savings rate to build long-term wealth. Aim to save at least 15-20% of your income.`,
                        priority: 'high'
                    }
                };
                if (finalEmergencyFallback[personaType]) {
                    actionableItems.push(finalEmergencyFallback[personaType]);
                    console.error(`OverarchingMessageService: FINAL EMERGENCY - Added fallback for ${personaType}`);
                }
                else {
                    actionableItems.push({
                        title: 'Optimize Your Financial Health',
                        description: `Continue monitoring your financial situation and take steps to improve your financial well-being. Review your spending, savings, and financial goals regularly.`,
                        priority: 'medium'
                    });
                    console.error('OverarchingMessageService: FINAL EMERGENCY - Added generic fallback');
                }
            }
        }
        else if (personaType === 'subscription_heavy') {
            // CRITICAL: Final verification - subscription_heavy MUST have subscription item
            const hasSubscriptionItem = actionableItems.some(item => item.title.toLowerCase().includes('subscription') ||
                item.title.toLowerCase().includes('audit') ||
                item.title.toLowerCase().includes('cancel'));
            if (!hasSubscriptionItem) {
                console.error('OverarchingMessageService: CRITICAL FINAL CHECK - subscription_heavy missing subscription item!', {
                    userId,
                    itemTitles: actionableItems.map(item => item.title)
                });
                // Replace all items with subscription item
                actionableItems.length = 0;
                actionableItems.push({
                    title: 'Review and Cancel Unused Subscriptions',
                    description: `You have multiple subscriptions. Regularly review each one and cancel any you don't use regularly. This can help reduce your monthly expenses and free up money for savings or other financial goals.`,
                    priority: 'high'
                });
                console.error('OverarchingMessageService: FINAL CHECK - REPLACED with subscription item');
            }
        }
        console.log('OverarchingMessageService: Final result', {
            userId,
            personaType,
            messageLength: message.length,
            actionableItemsCount: actionableItems.length,
            hasRecommendations: existingRecommendations.length > 0,
            actionableItemsTitles: actionableItems.map(item => item.title)
        });
        // CRITICAL: Verify we have at least one item before slicing
        const finalActionableItems = actionableItems.length > 0
            ? actionableItems.slice(0, 3) // Limit to top 3 items
            : [{
                    title: 'Explore Your Financial Dashboard',
                    description: 'Review your financial profile, recommendations, and insights to understand your financial health better.',
                    priority: 'medium'
                }];
        return {
            message,
            actionableItems: finalActionableItems
        };
    }
    catch (error) {
        console.error('Error in generateOverarchingMessage:', error);
        // CRITICAL: ALWAYS return a message, even on error
        return {
            message: 'Welcome to FinSight AI! We\'re analyzing your financial data to provide personalized recommendations.',
            actionableItems: [{
                    title: 'Explore Your Financial Dashboard',
                    description: 'Review your financial profile and recommendations to understand your financial health better.',
                    priority: 'medium'
                }]
        };
    }
}
