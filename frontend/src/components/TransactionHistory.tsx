// TransactionHistory Component
// Displays user transaction history with search and pagination

import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2, CreditCard } from 'lucide-react';
import { fetchTransactions, getErrorMessage } from '../services/api';
import type { Transaction, TransactionsResponse } from '../services/api';
import { ErrorMessage } from './ErrorMessage';

interface TransactionHistoryProps {
  userId: string;
}

export function TransactionHistory({ userId }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    loadTransactions();
  }, [userId, page, search]);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const result: TransactionsResponse = await fetchTransactions(userId, page, limit, search);
      setTransactions(result.transactions);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (err: any) {
      setError(getErrorMessage(err));
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1); // Reset to first page when searching
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
  };

  const highlightSearch = (text: string | null, searchTerm: string) => {
    if (!text || !searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-200 px-1 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Transaction History
        </h2>
        {total > 0 && (
          <span className="text-sm text-gray-500">
            {total} {total === 1 ? 'transaction' : 'transactions'}
          </span>
        )}
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by merchant or category..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-3 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-4 py-3 min-h-[44px] bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-colors touch-manipulation"
            >
              Clear
            </button>
          )}
        </div>
        {search && (
          <p className="mt-2 text-sm text-gray-600">
            Showing results for &quot;{search}&quot;
          </p>
        )}
      </form>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600">Loading transactions...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <ErrorMessage
          title="Error Loading Transactions"
          message={error}
          onRetry={loadTransactions}
          variant="error"
        />
      )}

      {/* Empty State */}
      {!loading && !error && transactions.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {search ? 'No transactions found matching your search.' : 'No transactions found.'}
          </p>
          {search && (
            <button
              onClick={handleClearSearch}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 active:text-blue-900 underline min-h-[44px] px-2 py-1 touch-manipulation"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Transactions - Mobile Card View / Desktop Table View */}
      {!loading && !error && transactions.length > 0 && (
        <>
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-3">
            {transactions.map((tx) => (
              <div key={tx.transaction_id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">
                      {search
                        ? highlightSearch(tx.merchant_name, search)
                        : tx.merchant_name || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(tx.date)}
                    </div>
                  </div>
                  <div
                    className={`text-right font-semibold ml-2 ${
                      tx.amount < 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {tx.amount < 0 ? '-' : '+'}
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  {search
                    ? highlightSearch(tx.category, search)
                    : tx.category || 'N/A'}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
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
                {transactions.map((tx) => (
                  <tr key={tx.transaction_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {search
                        ? highlightSearch(tx.merchant_name, search)
                        : tx.merchant_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {search
                        ? highlightSearch(tx.category, search)
                        : tx.category || 'N/A'}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        tx.amount < 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {tx.amount < 0 ? '-' : '+'}
                      {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}{' '}
                transactions
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 min-h-[44px] min-w-[44px] border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs sm:text-sm text-gray-600 px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 min-h-[44px] min-w-[44px] border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

