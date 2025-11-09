// ChatWindow Component
// Chat interface with message list and input

import { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2, Bot, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface ChatWindowProps {
  userId: string;
  onClose: () => void;
}

const SUGGESTED_QUESTIONS = [
  "What does my persona mean?",
  "What's my savings growth rate?",
  "How much did I spend on dining last month?",
  "What are my top spending categories?",
  "How can I improve my financial health?",
];

export function ChatWindow({ userId, onClose }: ChatWindowProps) {
  const { chatMessages: messages, chatLoading: isLoading, sendMessage, clearHistory } = useStore();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    // Clear input immediately before sending
    setInputValue('');

    await sendMessage(userId, userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedQuestion = async (question: string) => {
    // Clear input immediately before sending
    setInputValue('');
    await sendMessage(userId, question);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white sm:rounded-t-lg shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg">FinSight AI Assistant</h3>
            <p className="text-xs text-blue-100">Your financial education companion</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 min-w-[44px] min-h-[44px] hover:bg-blue-700 active:bg-blue-800 rounded transition-colors touch-manipulation flex items-center justify-center"
          aria-label="Close chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Bot className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">Welcome to FinSight AI</h4>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">Ask me anything about your finances! I'm here to help you understand your financial health and learn about money management.</p>
            <div className="space-y-2 max-w-lg mx-auto">
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Try asking:
              </p>
              {SUGGESTED_QUESTIONS.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="block w-full text-left px-4 py-3 min-h-[44px] text-sm text-blue-700 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-all border border-blue-200 touch-manipulation hover:shadow-md hover:border-blue-300 font-medium"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {question}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="text-sm prose prose-sm max-w-none prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2" {...props} />,
                      li: ({node, ...props}) => <li className="mb-1" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                      em: ({node, ...props}) => <em className="italic" {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-lg font-semibold mb-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-base font-semibold mb-2" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-sm font-semibold mb-2" {...props} />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
              {message.cached && (
                <p className="text-xs mt-1 opacity-70">(Cached response)</p>
              )}
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white sm:rounded-b-lg">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your finances..."
            className="flex-1 px-4 py-3 min-h-[44px] text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-3 min-w-[44px] min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 touch-manipulation"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700 min-h-[44px] px-2 py-1 touch-manipulation"
          >
            Clear history
          </button>
        )}
      </div>
    </div>
  );
}

