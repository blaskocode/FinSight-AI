// ChatBubble Component
// Floating chat button that expands into a chat window

import { MessageCircle, X } from 'lucide-react';
import { ChatWindow } from './ChatWindow';

interface ChatBubbleProps {
  userId: string | null;
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatBubble({ userId, isOpen, onToggle }: ChatBubbleProps) {
  if (!userId) {
    return null;
  }

  return (
    <>
      {/* Minimized: Floating button */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 min-w-[56px] min-h-[56px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 z-50 touch-manipulation"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Expanded: Chat window - Full screen on mobile, fixed size on desktop */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-96 sm:h-[600px] bg-white shadow-2xl flex flex-col z-50 border-0 sm:border border-gray-200 animate-in slide-in-from-bottom-5 duration-300">
          <ChatWindow userId={userId} onClose={onToggle} />
        </div>
      )}
    </>
  );
}

