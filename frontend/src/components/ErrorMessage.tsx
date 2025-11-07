// Error Message Component
// Displays user-friendly error messages with retry functionality

import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'error' | 'warning' | 'info';
  className?: string;
}

export function ErrorMessage({
  title = 'Error',
  message,
  onRetry,
  onDismiss,
  variant = 'error',
  className = '',
}: ErrorMessageProps) {
  const variantStyles = {
    error: {
      container: 'bg-red-50 border-red-200',
      icon: 'text-red-600',
      title: 'text-red-800',
      message: 'text-red-700',
      button: 'text-red-600 hover:text-red-800 active:text-red-900',
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: 'text-yellow-600',
      title: 'text-yellow-800',
      message: 'text-yellow-700',
      button: 'text-yellow-600 hover:text-yellow-800 active:text-yellow-900',
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-600',
      title: 'text-blue-800',
      message: 'text-blue-700',
      button: 'text-blue-600 hover:text-blue-800 active:text-blue-900',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={`border rounded-lg p-4 flex items-start gap-3 ${styles.container} ${className}`}>
      <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold mb-1 ${styles.title}`}>{title}</p>
        <p className={`text-sm ${styles.message}`}>{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className={`mt-2 text-sm underline flex items-center gap-1 min-h-[44px] px-2 py-1 touch-manipulation ${styles.button}`}
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`flex-shrink-0 p-1 rounded hover:bg-opacity-20 ${styles.button} min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation`}
          aria-label="Dismiss error"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

