import { useState, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import type { Transaction, TransactionStatus } from '../types';
import { TransactionDetailModal } from '../components';

const BACKEND_API_URL = 'http://localhost:5143/api/transactions';
const HUB_URL = 'http://localhost:5143/transactionHub';

type FilterType = 'All' | TransactionStatus;
type ModalMode = 'view' | 'edit' | 'create';

function Monitor() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [filter, setFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [isSeedingBurst, setIsSeedingBurst] = useState(false);
  const [showSeedInfo, setShowSeedInfo] = useState(false);
  const debounceTimerRef = useRef<number | null>(null);

  // Fetch transactions with optional search query
  const fetchTransactions = async (search?: string) => {
    setIsSearching(true);
    try {
      const url = search 
        ? `${BACKEND_API_URL}?search=${encodeURIComponent(search)}`
        : BACKEND_API_URL;
      
      const response = await fetch(url);
      if (response.ok) {
        const data: Transaction[] = await response.json();
        setTransactions(data.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch initial transactions on mount
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Debounced search effect
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        fetchTransactions(searchQuery.trim());
      } else {
        fetchTransactions();
      }
    }, 300);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Set up SignalR connection
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveTransaction', (transaction: Transaction) => {
      setTransactions((prev) => {
        const existingIndex = prev.findIndex(t => t.transactionId === transaction.transactionId);
        
        if (existingIndex >= 0) {
          // Update existing transaction
          const updated = [...prev];
          updated[existingIndex] = transaction;
          return updated;
        } else {
          // Prepend new transaction (latest on top) and cap at 200 items
          return [transaction, ...prev].slice(0, 200);
        }
      });
    });

    connection.onreconnecting(() => setIsConnected(false));
    connection.onreconnected(() => setIsConnected(true));
    connection.onclose(() => setIsConnected(false));

    connection.start()
      .then(() => {
        console.log('SignalR Connected');
        setIsConnected(true);
      })
      .catch(err => console.error('SignalR Connection Error:', err));

    return () => {
      connection.off('ReceiveTransaction');
      connection.stop();
    };
  }, []);

  // Filter transactions by status
  const filteredTransactions = filter === 'All' 
    ? transactions 
    : transactions.filter(t => t.status === filter);

  // Calculate stats
  const stats = {
    total: filteredTransactions.length,
    volume: filteredTransactions.reduce((sum, t) => sum + t.amount, 0),
    pending: filteredTransactions.filter(t => t.status === 'Pending').length,
    completed: filteredTransactions.filter(t => t.status === 'Completed').length,
    failed: filteredTransactions.filter(t => t.status === 'Failed').length,
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  // Shorten UUID
  const shortenId = (id: string) => {
    return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
  };

  // Status badge styling
  const getStatusBadge = (status: TransactionStatus) => {
    const styles = {
      Completed: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
      Pending: 'bg-amber-900/50 text-amber-300 border-amber-700',
      Failed: 'bg-rose-900/50 text-rose-300 border-rose-700',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
        {status}
      </span>
    );
  };

  // Clear screen handler
  const handleClearScreen = () => {
    setTransactions([]);
  };

  // Refresh/Show All handler
  const handleRefreshAll = () => {
    setSearchQuery('');
    setFilter('All');
    fetchTransactions();
  };

  // Show toast notification
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Generate random transaction
  const generateRandomTransaction = (): Transaction => {
    const statuses: TransactionStatus[] = ['Pending', 'Completed', 'Failed'];
    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];
    
    return {
      transactionId: crypto.randomUUID(),
      amount: Math.random() * 2000 - 500, // Range from -500 to 1500
      currency: currencies[Math.floor(Math.random() * currencies.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      timestamp: new Date().toISOString(),
    };
  };

  // Send random burst of transactions
  const handleSeedBurst = async () => {
    setIsSeedingBurst(true);
    try {
      const count = Math.floor(Math.random() * 100) + 1; // 1-100 transactions
      const transactions = Array.from({ length: count }, () => generateRandomTransaction());
      
      // Send all transactions to the API
      const promises = transactions.map(transaction =>
        fetch(BACKEND_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transaction),
        })
      );
      
      await Promise.all(promises);
      showToast(`🎲 Generated ${count} random transactions!`);
    } catch (error) {
      console.error('Error sending burst:', error);
      showToast('❌ Failed to generate transactions');
    } finally {
      setIsSeedingBurst(false);
    }
  };

  // Handle new transaction creation
  const handleNewTransaction = () => {
    // Create a fresh transaction with default values for creation mode
    const newTransaction: Transaction = {
      transactionId: crypto.randomUUID(),
      amount: 0,
      currency: 'USD',
      status: 'Pending',
      timestamp: new Date().toISOString(),
    };
    setSelectedTransaction(newTransaction);
    setModalMode('create');
  };

  // Handle viewing transaction from table
  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setModalMode('view');
  };

  // Handle modal close
  const handleModalClose = () => {
    setSelectedTransaction(null);
    setModalMode('view');
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header with Connection Status */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Live Dashboard
          </h2>
          <p className="text-base sm:text-lg text-slate-400">
            Real-time monitoring of financial transactions via SignalR WebSocket
          </p>
        </div>
        
        {/* Connection Status Badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            {isConnected && (
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping"></div>
            )}
          </div>
          <span className="text-sm font-medium text-slate-300">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="text-slate-400 text-sm font-medium mb-1">Total Volume</div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(stats.volume, 'USD')}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="text-slate-400 text-sm font-medium mb-1">Total Count</div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-900/20 to-amber-800/10 border border-amber-700/50 rounded-xl p-4">
          <div className="text-amber-400 text-sm font-medium mb-1">Pending</div>
          <div className="text-2xl font-bold text-amber-300">{stats.pending}</div>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 border border-emerald-700/50 rounded-xl p-4">
          <div className="text-emerald-400 text-sm font-medium mb-1">Completed</div>
          <div className="text-2xl font-bold text-emerald-300">{stats.completed}</div>
        </div>
        
        <div className="bg-gradient-to-br from-rose-900/20 to-rose-800/10 border border-rose-700/50 rounded-xl p-4">
          <div className="text-rose-400 text-sm font-medium mb-1">Failed</div>
          <div className="text-2xl font-bold text-rose-300">{stats.failed}</div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-6 space-y-4">
        {/* Search Input */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Transaction ID, Amount, or Status..."
              className={`w-full bg-slate-950 text-white border border-slate-700 rounded-lg pl-10 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${
                searchQuery || isSearching ? 'pr-10' : 'pr-4'
              }`}
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && !isSearching && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative inline-flex">
              <button
                onClick={handleSeedBurst}
                disabled={isSeedingBurst}
                className="h-10 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-purple-700 disabled:to-pink-700 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all flex items-center gap-2 whitespace-nowrap shadow-lg shadow-purple-500/30"
              >
                {isSeedingBurst ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Seeding...</span>
                  </>
                ) : (
                  <>
                    <span>🎲</span>
                    <span className="hidden sm:inline">Seed Burst (1-100)</span>
                    <span className="sm:hidden">Seed</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowSeedInfo(!showSeedInfo)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-lg z-10"
                aria-label="Seed Burst Info"
              >
                ℹ️
              </button>
              {showSeedInfo && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-slate-800 border border-indigo-500/50 rounded-xl p-4 shadow-2xl shadow-indigo-500/20 z-50 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎲</span>
                    <div>
                      <h4 className="text-white font-bold mb-2">What is Seed Burst?</h4>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        Generates a batch of <span className="font-semibold text-purple-400">1 to 100</span> realistic mock transactions with random amounts, currencies, and statuses, sending them straight to the backend to test real-time <span className="font-semibold text-indigo-400">SignalR WebSocket</span> updates.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSeedInfo(false)}
                      className="text-slate-400 hover:text-white transition-colors"
                      aria-label="Close info"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleNewTransaction}
              className="h-10 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium text-sm transition-all flex items-center gap-2 whitespace-nowrap shadow-lg shadow-green-500/30"
            >
              <span>➕</span>
              <span className="hidden sm:inline">New Transaction</span>
              <span className="sm:hidden">New</span>
            </button>
            <button
              onClick={handleRefreshAll}
              className="h-10 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Refresh All</span>
            </button>
            <button
              onClick={handleClearScreen}
              className="h-10 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium text-sm transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden sm:inline">Clear Screen</span>
            </button>
          </div>
        </div>
        
        {/* Status Filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-slate-400 text-sm font-medium">Status Filter:</span>
          {(['All', 'Pending', 'Completed', 'Failed'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${filter === f 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}
              `}
            >
              {f}
            </button>
          ))}
        </div>
        
        {/* Search Info */}
        {searchQuery && (
          <div className="text-sm text-slate-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Showing results for: <span className="font-semibold text-white">"{searchQuery}"</span></span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <div className="text-xl text-slate-400">No transactions yet</div>
            <div className="text-sm text-slate-500 mt-2">
              Transactions will appear here in real-time
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTransactions.map((transaction) => (
                  <tr 
                    key={transaction.transactionId}
                    className="cursor-pointer hover:bg-slate-800/50 transition-colors animate-fade-in"
                    onClick={() => handleViewTransaction(transaction)}
                  >
                    <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                      {formatTime(transaction.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400 font-mono">
                      {shortenId(transaction.transactionId)}
                    </td>
                    <td className={`px-4 py-3 text-sm font-semibold text-right whitespace-nowrap ${
                      transaction.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount, transaction.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300 font-medium">
                      {transaction.currency}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(transaction.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={selectedTransaction !== null}
        onClose={handleModalClose}
        mode={modalMode}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-slate-900 border border-slate-700 rounded-xl px-6 py-4 shadow-2xl shadow-purple-500/20 flex items-center gap-3 backdrop-blur-sm">
            <div className="text-2xl">{toastMessage.includes('❌') ? '❌' : '🎲'}</div>
            <div className="text-white font-medium">{toastMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Monitor;
