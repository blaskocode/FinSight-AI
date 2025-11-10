// Overarching Message Component
// Displays personalized AI message with actionable recommendations

import { useEffect, useState, useRef, useMemo } from 'react';
import { fetchOverarchingMessage, type OverarchingMessageResponse } from '../services/api';
import { Loader2, AlertCircle, CheckCircle2, Target } from 'lucide-react';
import { useStore } from '../store/useStore';

interface OverarchingMessageProps {
  userId: string;
}

export function OverarchingMessage({ userId }: OverarchingMessageProps) {
  const [message, setMessage] = useState<OverarchingMessageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  // Error state kept for potential future error display
  const [, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const { persona } = useStore(); // Get persona from store to create persona-specific fallbacks
  // Note: persona.type is the persona type (e.g., 'subscription_heavy')
  
  // CRITICAL: useMemo MUST be called before any conditional returns to follow Rules of Hooks
  const personaType = persona?.type; // persona.type, not persona.persona_type!
  const finalMessage = useMemo(() => {
    if (!message) {
      return {
        message: 'Welcome to FinSight AI! We\'re analyzing your financial data to provide personalized recommendations.',
        actionableItems: personaType === 'subscription_heavy' ? [{
          title: 'Review and Cancel Unused Subscriptions',
          description: 'You have multiple subscriptions. Regularly review each one and cancel any you don\'t use regularly. This can help reduce your monthly expenses and free up money for savings or other financial goals.',
          priority: 'high' as const
        }] : [{
          title: 'Explore Your Financial Dashboard',
          description: 'Review your financial profile, recommendations, and insights to understand your financial health better.',
          priority: 'medium' as const
        }]
      };
    }
    
    // Ensure message text exists
    const messageText = message.message?.trim() || 'Welcome to FinSight AI! We\'re analyzing your financial data to provide personalized recommendations.';
    
    // CRITICAL: For subscription_heavy, ALWAYS ensure subscription-specific item
    if (personaType === 'subscription_heavy') {
      const hasSubscriptionItem = message.actionableItems.some(item => 
        item.title.toLowerCase().includes('subscription') || 
        item.title.toLowerCase().includes('audit') ||
        item.title.toLowerCase().includes('cancel')
      );
      
      if (!hasSubscriptionItem) {
        console.error('OverarchingMessage: FINAL RENDER CHECK - FORCING subscription item!', {
          userId,
          currentItems: message.actionableItems.map(item => item.title),
          personaType
        });
        // Update state asynchronously to avoid render issues
        setTimeout(() => {
          setMessage({
            message: messageText,
            actionableItems: [{
              title: 'Review and Cancel Unused Subscriptions',
              description: 'You have multiple subscriptions. Regularly review each one and cancel any you don\'t use regularly. This can help reduce your monthly expenses and free up money for savings or other financial goals.',
              priority: 'high' as const
            }]
          });
        }, 0);
        // Return corrected message for this render
        return {
          message: messageText,
          actionableItems: [{
            title: 'Review and Cancel Unused Subscriptions',
            description: 'You have multiple subscriptions. Regularly review each one and cancel any you don\'t use regularly. This can help reduce your monthly expenses and free up money for savings or other financial goals.',
            priority: 'high' as const
          }]
        };
      }
    }
    
    return {
      message: messageText,
      actionableItems: message.actionableItems
    };
  }, [message, personaType, userId]);

  useEffect(() => {
    if (!userId || loadingRef.current) {
      return;
    }
    loadMessage();
  }, [userId]); // Load message when userId changes

  // CRITICAL: Re-process message when persona becomes available
  // This ensures subscription_heavy gets subscription item even if message loaded before persona
  useEffect(() => {
    if (!message || !persona) {
      return;
    }
    
    const personaType = persona?.type; // persona.type, not persona.persona_type!
    console.log('OverarchingMessage: Persona loaded, checking subscription_heavy', {
      userId,
      personaType,
      hasMessage: !!message,
      currentItems: message.actionableItems.map(item => item.title),
      personaObject: persona
    });
    
    // CRITICAL: Re-process message for all personas to ensure persona-specific items
    if (personaType === 'subscription_heavy') {
      const hasSubscriptionItem = message.actionableItems.some(item => 
        item.title.toLowerCase().includes('subscription') || 
        item.title.toLowerCase().includes('audit') ||
        item.title.toLowerCase().includes('cancel')
      );
      
      if (!hasSubscriptionItem) {
        console.error('OverarchingMessage: CRITICAL - Re-processing message for subscription_heavy!', {
          userId,
          currentItems: message.actionableItems.map(item => item.title),
          personaType
        });
        setMessage({
          ...message,
          actionableItems: [{
            title: 'Review and Cancel Unused Subscriptions',
            description: 'You have multiple subscriptions. Regularly review each one and cancel any you don\'t use regularly. This can help reduce your monthly expenses and free up money for savings or other financial goals.',
            priority: 'high' as const
          }]
        });
        console.error('OverarchingMessage: RE-PROCESSED message with subscription item');
      }
    } else if (personaType === 'high_utilization') {
      const hasDebtItem = message.actionableItems.some(item => 
        item.title.toLowerCase().includes('debt') || 
        item.title.toLowerCase().includes('utilization') ||
        item.title.toLowerCase().includes('credit') ||
        item.title.toLowerCase().includes('interest') ||
        item.title.toLowerCase().includes('payoff')
      );
      
      if (!hasDebtItem) {
        console.error('OverarchingMessage: CRITICAL - Re-processing message for high_utilization!', {
          userId,
          currentItems: message.actionableItems.map(item => item.title),
          personaType
        });
        setMessage({
          ...message,
          actionableItems: [{
            title: 'Monitor Your Credit Utilization',
            description: 'Keep your credit card balances low and make payments on time. Aim to keep utilization below 30% to improve your credit score.',
            priority: 'high' as const
          }]
        });
        console.error('OverarchingMessage: RE-PROCESSED message with debt/utilization item');
      }
    } else if (personaType === 'variable_income') {
      const hasEmergencyItem = message.actionableItems.some(item => 
        item.title.toLowerCase().includes('emergency') || 
        item.title.toLowerCase().includes('fund') ||
        item.title.toLowerCase().includes('buffer')
      );
      
      if (!hasEmergencyItem) {
        console.error('OverarchingMessage: CRITICAL - Re-processing message for variable_income!', {
          userId,
          currentItems: message.actionableItems.map(item => item.title),
          personaType
        });
        setMessage({
          ...message,
          actionableItems: [{
            title: 'Build Your Emergency Fund',
            description: 'With variable income, having a robust emergency fund is essential. Aim for 3-6 months of expenses to protect against income fluctuations.',
            priority: 'high' as const
          }]
        });
        console.error('OverarchingMessage: RE-PROCESSED message with emergency fund item');
      }
    } else if (personaType === 'savings_builder') {
      const hasSavingsItem = message.actionableItems.some(item => 
        item.title.toLowerCase().includes('savings') || 
        item.title.toLowerCase().includes('emergency') ||
        item.title.toLowerCase().includes('fund') ||
        item.title.toLowerCase().includes('optimize') ||
        item.title.toLowerCase().includes('investment')
      );
      
      if (!hasSavingsItem) {
        console.error('OverarchingMessage: CRITICAL - Re-processing message for savings_builder!', {
          userId,
          currentItems: message.actionableItems.map(item => item.title),
          personaType
        });
        setMessage({
          ...message,
          actionableItems: [{
            title: 'Continue Building Your Savings',
            description: 'You\'re doing great with savings! Consider setting specific savings goals and exploring ways to optimize your savings growth, such as high-yield savings accounts.',
            priority: 'medium' as const
          }]
        });
        console.error('OverarchingMessage: RE-PROCESSED message with savings item');
      }
    } else if (personaType === 'lifestyle_creep') {
      const hasSavingsItem = message.actionableItems.some(item => 
        item.title.toLowerCase().includes('savings') || 
        item.title.toLowerCase().includes('align') ||
        item.title.toLowerCase().includes('income') ||
        item.title.toLowerCase().includes('wealth')
      );
      
      if (!hasSavingsItem) {
        console.error('OverarchingMessage: CRITICAL - Re-processing message for lifestyle_creep!', {
          userId,
          currentItems: message.actionableItems.map(item => item.title),
          personaType
        });
        setMessage({
          ...message,
          actionableItems: [{
            title: 'Align Savings with Income',
            description: 'You have strong income. Consider increasing your savings rate to build long-term wealth. Aim to save at least 15-20% of your income.',
            priority: 'high' as const
          }]
        });
        console.error('OverarchingMessage: RE-PROCESSED message with savings alignment item');
      }
    }
  }, [persona, message, userId]); // Re-check when persona or message changes

  const loadMessage = async () => {
    if (loadingRef.current) {
      return; // Already loading
    }
    loadingRef.current = true;
    if (!userId) {
      console.warn('OverarchingMessage: No userId provided');
      loadingRef.current = false;
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      console.log('OverarchingMessage: Fetching message for user:', userId);
      const data = await fetchOverarchingMessage(userId);
      console.log('OverarchingMessage: Received data:', { 
        message: data?.message,
        messageLength: data?.message?.length,
        actionableItemsCount: data?.actionableItems?.length,
        actionableItems: data?.actionableItems,
        hasMessage: !!data?.message,
        messageIsEmpty: !data?.message || data.message.trim() === ''
      });
      
      // CRITICAL: ALWAYS ensure we have at least one actionable item
      // This is NON-NEGOTIABLE - every user must have at least one recommended action
      let finalActionableItems = data?.actionableItems || [];
      const personaType = persona?.type; // persona.type, not persona.persona_type!
      
      console.log('OverarchingMessage: Processing actionable items', {
        userId,
        personaType,
        receivedItemsCount: finalActionableItems.length,
        receivedItemTitles: finalActionableItems.map(item => item.title),
        hasPersona: !!persona
      });
      
      // CRITICAL: For each persona, ALWAYS ensure persona-specific item
      // This check happens REGARDLESS of whether we have items or not
      if (personaType === 'subscription_heavy') {
        const hasSubscriptionItem = finalActionableItems.some(item => 
          item.title.toLowerCase().includes('subscription') || 
          item.title.toLowerCase().includes('audit') ||
          item.title.toLowerCase().includes('cancel')
        );
        
        if (!hasSubscriptionItem) {
          console.error('OverarchingMessage: CRITICAL - subscription_heavy missing subscription item!', {
            userId,
            currentItems: finalActionableItems.map(item => item.title),
            receivedFromAPI: data?.actionableItems?.map(item => item.title)
          });
          finalActionableItems = [{
            title: 'Review and Cancel Unused Subscriptions',
            description: 'You have multiple subscriptions. Regularly review each one and cancel any you don\'t use regularly. This can help reduce your monthly expenses and free up money for savings or other financial goals.',
            priority: 'high' as const
          }];
          console.error('OverarchingMessage: FORCED subscription item for subscription_heavy', {
            newItemTitle: finalActionableItems[0].title,
            newItemPriority: finalActionableItems[0].priority
          });
        }
      } else if (personaType === 'high_utilization') {
        const hasDebtItem = finalActionableItems.some(item => 
          item.title.toLowerCase().includes('debt') || 
          item.title.toLowerCase().includes('utilization') ||
          item.title.toLowerCase().includes('credit') ||
          item.title.toLowerCase().includes('interest') ||
          item.title.toLowerCase().includes('payoff')
        );
        
        if (!hasDebtItem) {
          console.error('OverarchingMessage: CRITICAL - high_utilization missing debt/utilization item!', {
            userId,
            currentItems: finalActionableItems.map(item => item.title)
          });
          finalActionableItems = [{
            title: 'Monitor Your Credit Utilization',
            description: 'Keep your credit card balances low and make payments on time. Aim to keep utilization below 30% to improve your credit score.',
            priority: 'high' as const
          }];
          console.error('OverarchingMessage: FORCED debt/utilization item for high_utilization');
        }
      } else if (personaType === 'variable_income') {
        const hasEmergencyItem = finalActionableItems.some(item => 
          item.title.toLowerCase().includes('emergency') || 
          item.title.toLowerCase().includes('fund') ||
          item.title.toLowerCase().includes('buffer')
        );
        
        if (!hasEmergencyItem) {
          console.error('OverarchingMessage: CRITICAL - variable_income missing emergency fund item!', {
            userId,
            currentItems: finalActionableItems.map(item => item.title)
          });
          finalActionableItems = [{
            title: 'Build Your Emergency Fund',
            description: 'With variable income, having a robust emergency fund is essential. Aim for 3-6 months of expenses to protect against income fluctuations.',
            priority: 'high' as const
          }];
          console.error('OverarchingMessage: FORCED emergency fund item for variable_income');
        }
      } else if (personaType === 'savings_builder') {
        const hasSavingsItem = finalActionableItems.some(item => 
          item.title.toLowerCase().includes('savings') || 
          item.title.toLowerCase().includes('emergency') ||
          item.title.toLowerCase().includes('fund') ||
          item.title.toLowerCase().includes('optimize') ||
          item.title.toLowerCase().includes('investment')
        );
        
        if (!hasSavingsItem) {
          console.error('OverarchingMessage: CRITICAL - savings_builder missing savings item!', {
            userId,
            currentItems: finalActionableItems.map(item => item.title)
          });
          finalActionableItems = [{
            title: 'Continue Building Your Savings',
            description: 'You\'re doing great with savings! Consider setting specific savings goals and exploring ways to optimize your savings growth, such as high-yield savings accounts.',
            priority: 'medium' as const
          }];
          console.error('OverarchingMessage: FORCED savings item for savings_builder');
        }
      } else if (personaType === 'lifestyle_creep') {
        const hasSavingsItem = finalActionableItems.some(item => 
          item.title.toLowerCase().includes('savings') || 
          item.title.toLowerCase().includes('align') ||
          item.title.toLowerCase().includes('income') ||
          item.title.toLowerCase().includes('wealth')
        );
        
        if (!hasSavingsItem) {
          console.error('OverarchingMessage: CRITICAL - lifestyle_creep missing savings alignment item!', {
            userId,
            currentItems: finalActionableItems.map(item => item.title)
          });
          finalActionableItems = [{
            title: 'Align Savings with Income',
            description: 'You have strong income. Consider increasing your savings rate to build long-term wealth. Aim to save at least 15-20% of your income.',
            priority: 'high' as const
          }];
          console.error('OverarchingMessage: FORCED savings alignment item for lifestyle_creep');
        }
      }
      
      // If still no actionable items (for non-subscription_heavy personas), create fallback
      if (finalActionableItems.length === 0) {
        console.error('OverarchingMessage: CRITICAL - No actionable items after processing!', {
          userId,
          hasData: !!data,
          message: data?.message,
          personaType
        });
        
        // Generic fallback for other personas
        finalActionableItems = [{
          title: 'Explore Your Financial Dashboard',
          description: 'Review your financial profile, recommendations, and insights to understand your financial health better.',
          priority: 'medium' as const
        }];
      }
      
      // CRITICAL: ALWAYS set a message, even if empty
      if (!data) {
        console.error('OverarchingMessage: CRITICAL - No data received from API!');
        setMessage({
          message: 'Welcome to FinSight AI! We\'re analyzing your financial data to provide personalized recommendations.',
          actionableItems: finalActionableItems
        });
      } else if (!data.message || data.message.trim() === '') {
        console.warn('OverarchingMessage: Received empty message, using fallback');
        setMessage({
          message: 'Welcome to FinSight AI! We\'re analyzing your financial data to provide personalized recommendations.',
          actionableItems: finalActionableItems
        });
      } else {
        // Ensure actionableItems exists and has at least one item
        setMessage({
          message: data.message,
          actionableItems: finalActionableItems
        });
      }
      
      // Log final state
      console.log('OverarchingMessage: Final state after processing', {
        userId,
        actionableItemsCount: finalActionableItems.length,
        hasMessage: !!message?.message
      });
    } catch (err: any) {
      console.error('OverarchingMessage: Failed to load:', err);
      console.error('OverarchingMessage: Error details:', err.response?.data || err.message);
      // CRITICAL: Even on error, show a message - don't hide the component
      // CRITICAL: subscription_heavy MUST get subscription-specific item even on error
      setError(null); // Don't show error state, just use fallback message
      const personaType = persona?.type; // persona.type, not persona.persona_type!
      let errorActionableItems: Array<{title: string; description: string; priority: 'high' | 'medium' | 'low'}>;
      
      if (personaType === 'subscription_heavy') {
        errorActionableItems = [{
          title: 'Review and Cancel Unused Subscriptions',
          description: 'You have multiple subscriptions. Regularly review each one and cancel any you don\'t use regularly. This can help reduce your monthly expenses and free up money for savings or other financial goals.',
          priority: 'high' as const
        }];
      } else if (personaType === 'high_utilization') {
        errorActionableItems = [{
          title: 'Monitor Your Credit Utilization',
          description: 'Keep your credit card balances low and make payments on time. Aim to keep utilization below 30% to improve your credit score.',
          priority: 'high' as const
        }];
      } else if (personaType === 'variable_income') {
        errorActionableItems = [{
          title: 'Build Your Emergency Fund',
          description: 'With variable income, having a robust emergency fund is essential. Aim for 3-6 months of expenses to protect against income fluctuations.',
          priority: 'high' as const
        }];
      } else if (personaType === 'savings_builder') {
        errorActionableItems = [{
          title: 'Continue Building Your Savings',
          description: 'You\'re doing great with savings! Consider setting specific savings goals and exploring ways to optimize your savings growth, such as high-yield savings accounts.',
          priority: 'medium' as const
        }];
      } else if (personaType === 'lifestyle_creep') {
        errorActionableItems = [{
          title: 'Align Savings with Income',
          description: 'You have strong income. Consider increasing your savings rate to build long-term wealth. Aim to save at least 15-20% of your income.',
          priority: 'high' as const
        }];
      } else {
        errorActionableItems = [{
          title: 'Explore Your Dashboard',
          description: 'Review your financial profile, recommendations, and insights to understand your financial health better.',
          priority: 'medium' as const
        }];
      }
      setMessage({
        message: 'Welcome to FinSight AI! We\'re analyzing your financial data to provide personalized recommendations.',
        actionableItems: errorActionableItems
      });
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-l-4 border-blue-600 rounded-xl p-6 mb-6 shadow-lg">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          <div>
            <span className="text-blue-800 font-semibold block">Loading your personalized recommendations...</span>
            <span className="text-blue-600 text-sm">Analyzing your financial data</span>
          </div>
        </div>
      </div>
    );
  }


  // CRITICAL: Don't show error state - always show a message instead
  // Errors are handled by setting a fallback message
  // This ensures the component ALWAYS renders something

  // CRITICAL: ALWAYS show the message if we have one
  // Never return null if we have message data
  if (!finalMessage) {
    console.error('OverarchingMessage: CRITICAL - No finalMessage, this should never happen!');
    // Even if finalMessage is null, show a fallback
    return (
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-l-4 border-blue-600 rounded-xl p-6 mb-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md flex-shrink-0">
            <Target className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Action Plan</h2>
            <p className="text-gray-800 leading-relaxed text-base">
              Welcome to FinSight AI! We're analyzing your financial data to provide personalized recommendations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  console.log('OverarchingMessage: Rendering component', {
    hasMessage: !!finalMessage.message,
    messageLength: finalMessage.message?.length,
    actionableItemsCount: finalMessage.actionableItems?.length || 0,
    personaType,
    currentItems: finalMessage.actionableItems.map(item => ({
      title: item.title,
      priority: item.priority,
      isSubscription: item.title.toLowerCase().includes('subscription') || item.title.toLowerCase().includes('audit') || item.title.toLowerCase().includes('cancel')
    }))
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'low':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-5 h-5" />;
      case 'medium':
        return <Target className="w-5 h-5" />;
      case 'low':
        return <CheckCircle2 className="w-5 h-5" />;
      default:
        return <Target className="w-5 h-5" />;
    }
  };

  // Debug: Force render to verify component is working
  if (!finalMessage.message || finalMessage.message.trim() === '') {
    console.error('OverarchingMessage: Message is empty!', finalMessage);
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-l-4 border-blue-600 rounded-xl p-6 mb-6 shadow-lg" data-testid="overarching-message">
      <div className="flex items-start gap-4 mb-5">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md flex-shrink-0">
          <Target className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-2xl font-bold text-gray-900">Your Action Plan</h2>
            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">AI-Powered</span>
          </div>
          <p className="text-gray-800 leading-relaxed text-base">{finalMessage.message}</p>
        </div>
      </div>

      {/* CRITICAL: ALWAYS show recommended actions - this should never be empty due to fallbacks */}
      {finalMessage.actionableItems && finalMessage.actionableItems.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Recommended Actions</p>
          {[...finalMessage.actionableItems].sort((a, b) => {
            // Sort by priority: high > medium > low
            const priorityOrder: Record<string, number> = { 'high': 0, 'medium': 1, 'low': 2 };
            const aPriority = priorityOrder[a.priority] ?? 3;
            const bPriority = priorityOrder[b.priority] ?? 3;
            return aPriority - bPriority;
          }).map((item, index) => (
          <div
            key={index}
            className={`border-l-4 rounded-r-xl p-5 shadow-md hover:shadow-lg transition-shadow ${getPriorityColor(item.priority)}`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-0.5 p-2 bg-white/50 rounded-lg">
                {getPriorityIcon(item.priority)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-base">{item.title}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    item.priority === 'high' ? 'bg-red-200 text-red-800' :
                    item.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-blue-200 text-blue-800'
                  }`}>
                    {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed opacity-90">{item.description}</p>
              </div>
            </div>
          </div>
          ))}
        </div>
      ) : (
        // CRITICAL FALLBACK: If somehow we have no actionable items, show a default one
        // This should NEVER happen due to the fallback logic above, but this is a final safeguard
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Recommended Actions</p>
          <div className="border-l-4 rounded-r-xl p-5 shadow-md hover:shadow-lg transition-shadow bg-yellow-100 border-yellow-300 text-yellow-800">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-0.5 p-2 bg-white/50 rounded-lg">
                <Target className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-base">Explore Your Financial Dashboard</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800">
                    Medium
                  </span>
                </div>
                <p className="text-sm leading-relaxed opacity-90">
                  Review your financial profile, recommendations, and insights to understand your financial health better.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

