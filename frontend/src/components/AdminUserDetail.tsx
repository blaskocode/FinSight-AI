// AdminUserDetail Component
// Detailed view of a single user for admin

import { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Loader2, TrendingUp, CreditCard, BookOpen, Calendar } from 'lucide-react';
import { fetchUserDetail } from '../services/api';
import type { UserDetail } from '../services/api';
import { getPersonaConfig } from '../utils/personaConfig';

interface AdminUserDetailProps {
  userId: string;
  onBack: () => void;
}

export function AdminUserDetail({ userId, onBack }: AdminUserDetailProps) {
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserDetail();
  }, [userId]);

  const loadUserDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchUserDetail(userId);
      setUserDetail(detail);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to User List
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!userDetail) {
    return null;
  }

  const formatPersonaType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const personaConfig = userDetail.persona ? getPersonaConfig(userDetail.persona.type as any) : null;
  const PersonaIcon = personaConfig?.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to User List
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{userDetail.name}</h1>
          <p className="text-gray-600 mt-1">{userDetail.email}</p>
        </div>

        {/* Consent Warning */}
        {!userDetail.has_consent && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">Consent Required</span>
            </div>
            <p className="text-yellow-700 mt-2">
              User has not consented to data sharing. Detailed financial data is not available.
            </p>
          </div>
        )}

        {/* User Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Persona Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Persona</h2>
            {userDetail.persona ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  {PersonaIcon && (
                    <div className={`p-2 rounded-lg ${personaConfig?.color.bg} ${personaConfig?.color.text}`}>
                      <PersonaIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900">
                      {formatPersonaType(userDetail.persona.type)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Confidence: {Math.round(userDetail.persona.confidence * 100)}%
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Assigned: {formatDate(userDetail.persona.assigned_at)}
                </div>
                {userDetail.persona.secondary_personas.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">Secondary Personas:</div>
                    <div className="flex flex-wrap gap-2">
                      {userDetail.persona.secondary_personas.map((p, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {formatPersonaType(p)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-600">No persona assigned</p>
            )}
          </div>

          {/* Account Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">User ID:</span>
                <span className="ml-2 font-mono text-gray-900">{userDetail.user_id}</span>
              </div>
              <div>
                <span className="text-gray-600">Created:</span>
                <span className="ml-2 text-gray-900">{formatDate(userDetail.created_at)}</span>
              </div>
              <div>
                <span className="text-gray-600">Consent Status:</span>
                <span
                  className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                    userDetail.has_consent
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {userDetail.has_consent ? 'Active' : 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Persona History */}
        {userDetail.persona_history.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Persona History
            </h2>
            <div className="space-y-3">
              {userDetail.persona_history.map((p, idx) => (
                <div
                  key={p.persona_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {formatPersonaType(p.persona_type)}
                      </div>
                      <div className="text-sm text-gray-600">{formatDate(p.assigned_at)}</div>
                    </div>
                  </div>
                  {idx === 0 && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Current
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {userDetail.recommendations.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Current Recommendations ({userDetail.recommendations.length})
            </h2>
            <div className="space-y-3">
              {userDetail.recommendations.map((rec) => (
                <div key={rec.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            rec.type === 'education'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {rec.type === 'education' ? 'Education' : 'Partner Offer'}
                        </span>
                        <span className="font-semibold text-gray-900">{rec.title}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{rec.rationale}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions */}
        {userDetail.has_consent && userDetail.transactions.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Recent Transactions ({userDetail.transactions.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Merchant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userDetail.transactions.map((tx) => (
                    <tr key={tx.transaction_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {tx.merchant_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {tx.category || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        {formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Signals (if consent) */}
        {userDetail.has_consent && userDetail.signals && Object.keys(userDetail.signals).length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Behavioral Signals
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(userDetail.signals).map(([key, value]) => {
                if (key === 'confidence' || key === 'criteriaMet') return null;
                if (typeof value === 'object' && value !== null) return null;
                return (
                  <div key={key} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {typeof value === 'number'
                        ? value.toFixed(2)
                        : typeof value === 'string'
                        ? value
                        : JSON.stringify(value)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

