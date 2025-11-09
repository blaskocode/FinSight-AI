// ConfirmDialog Component
// Reusable confirmation dialog for user actions

import { X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  // Optional third action button
  thirdActionText?: string;
  onThirdAction?: () => void;
  thirdActionVariant?: 'default' | 'danger';
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
  thirdActionText,
  onThirdAction,
  thirdActionVariant = 'default',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onCancel}
            className="p-2 min-w-[44px] min-h-[44px] hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-700">{message}</p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 flex-wrap">
          <button
            onClick={onCancel}
            className="px-4 py-2 min-h-[44px] text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
          >
            {cancelText}
          </button>
          {thirdActionText && onThirdAction && (
            <button
              onClick={onThirdAction}
              disabled={isLoading}
              className={`px-4 py-2 min-h-[44px] text-sm font-medium rounded-lg transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${
                thirdActionVariant === 'danger'
                  ? 'text-white bg-red-600 hover:bg-red-700 active:bg-red-800'
                  : 'text-white bg-gray-600 hover:bg-gray-700 active:bg-gray-800'
              }`}
            >
              {thirdActionText}
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 min-h-[44px] text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

