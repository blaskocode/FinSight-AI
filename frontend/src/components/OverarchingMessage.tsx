// Overarching Message Component
// Displays personalized AI message with actionable recommendations

import { useEffect, useState, useRef } from 'react';
import { fetchOverarchingMessage, type OverarchingMessageResponse } from '../services/api';
import { Loader2, AlertCircle, CheckCircle2, Target } from 'lucide-react';

interface OverarchingMessageProps {
  userId: string;
}

export function OverarchingMessage({ userId }: OverarchingMessageProps) {
  const [message, setMessage] = useState<OverarchingMessageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!userId || loadingRef.current) {
      return;
    }
    loadMessage();
  }, [userId]);

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
        actionableItemsCount: data?.actionableItems?.length,
        actionableItems: data?.actionableItems
      });
      setMessage(data);
      // Log if we got data but no actionable items
      if (data && data.actionableItems.length === 0) {
        console.log('OverarchingMessage: Loaded but no actionable items for user:', userId);
      }
    } catch (err: any) {
      console.error('OverarchingMessage: Failed to load:', err);
      console.error('OverarchingMessage: Error details:', err.response?.data || err.message);
      setError(err.response?.data?.error || err.message || 'Failed to load recommendations');
      // Set a fallback message so user knows something happened
      setMessage({
        message: 'Welcome to FinSight AI! We\'re analyzing your financial data to provide personalized recommendations.',
        actionableItems: []
      });
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-blue-700 font-medium">Loading your personalized recommendations...</span>
        </div>
      </div>
    );
  }

  // Show error message if there was an error
  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium text-sm">Unable to load recommendations</p>
            <p className="text-yellow-700 text-xs mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't show if no message or no actionable items (this is expected for some users)
  if (!message || message.actionableItems.length === 0) {
    return null;
  }

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

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Target className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Your Action Plan</h2>
          <p className="text-gray-700">{message.message}</p>
        </div>
      </div>

      <div className="space-y-3">
        {message.actionableItems.map((item, index) => (
          <div
            key={index}
            className={`border-l-4 rounded-r-lg p-4 ${getPriorityColor(item.priority)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getPriorityIcon(item.priority)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm opacity-90">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

