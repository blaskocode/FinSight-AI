// Persona configuration: colors, icons, and descriptions for all personas

import { 
  AlertCircle, 
  TrendingUp, 
  Layers, 
  PiggyBank, 
  ArrowUpRight,
  type LucideIcon 
} from 'lucide-react';

export type PersonaType = 
  | 'high_utilization'
  | 'variable_income'
  | 'subscription_heavy'
  | 'savings_builder'
  | 'lifestyle_creep';

export interface PersonaConfig {
  type: PersonaType;
  displayName: string;
  color: {
    primary: string;      // Main color (e.g., #EF4444)
    bg: string;          // Background (e.g., bg-red-100)
    text: string;        // Text color (e.g., text-red-800)
    border: string;      // Border color (e.g., border-red-300)
    accent: string;      // Accent color (e.g., border-red-500)
  };
  icon: LucideIcon;
  description: string;
  focus: string;
}

export const PERSONA_CONFIGS: Record<PersonaType, PersonaConfig> = {
  high_utilization: {
    type: 'high_utilization',
    displayName: 'High Utilization',
    color: {
      primary: '#EF4444',
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300',
      accent: 'border-red-500',
    },
    icon: AlertCircle,
    description: 'You\'re using a high percentage of your available credit, which can impact your credit score and lead to interest charges.',
    focus: 'Reduce utilization and interest; payment planning and autopay education',
  },
  variable_income: {
    type: 'variable_income',
    displayName: 'Variable Income Budgeter',
    color: {
      primary: '#F59E0B',
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-300',
      accent: 'border-orange-500',
    },
    icon: TrendingUp,
    description: 'Your income varies significantly, making it challenging to maintain consistent cash flow and build savings.',
    focus: 'Percent-based budgets, emergency fund basics, income smoothing strategies',
  },
  subscription_heavy: {
    type: 'subscription_heavy',
    displayName: 'Subscription Heavy',
    color: {
      primary: '#A855F7',
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      border: 'border-purple-300',
      accent: 'border-purple-500',
    },
    icon: Layers,
    description: 'You have multiple recurring subscriptions that may be eating into your budget more than you realize.',
    focus: 'Subscription audit, cancellation/negotiation tips, bill alerts',
  },
  savings_builder: {
    type: 'savings_builder',
    displayName: 'Savings Builder',
    color: {
      primary: '#10B981',
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300',
      accent: 'border-green-500',
    },
    icon: PiggyBank,
    description: 'You\'re building healthy savings habits with regular contributions and low credit utilization.',
    focus: 'Goal setting, automation, APY optimization (HYSA/CD basics)',
  },
  lifestyle_creep: {
    type: 'lifestyle_creep',
    displayName: 'Lifestyle Creep',
    color: {
      primary: '#3B82F6',
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-300',
      accent: 'border-blue-500',
    },
    icon: ArrowUpRight,
    description: 'You have high income but low savings rate, with significant discretionary spending that could be redirected to wealth building.',
    focus: 'Wealth building, retirement gap analysis, opportunity cost education, tax-advantaged accounts',
  },
};

/**
 * Get persona configuration by type
 */
export function getPersonaConfig(type: string): PersonaConfig {
  return PERSONA_CONFIGS[type as PersonaType] || PERSONA_CONFIGS.high_utilization;
}

/**
 * Format persona type for display
 */
export function formatPersonaType(type: string): string {
  const config = getPersonaConfig(type);
  return config.displayName;
}

