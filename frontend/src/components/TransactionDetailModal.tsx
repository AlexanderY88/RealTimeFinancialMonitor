import React, { useEffect, useState } from 'react';
import { Transaction } from '../types/transaction';

type ModalMode = 'view' | 'edit' | 'create';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  mode?: ModalMode; // 'view' | 'edit' | 'create'
}


 // Modal component for displaying detailed transaction information.
 
export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  isOpen,
  onClose,
  mode = 'view',
}) => {
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [isEditMode, setIsEditMode] = useState(mode === 'create' || mode === 'edit');
  const [editedAmount, setEditedAmount] = useState<string>('');
  const [editedStatus, setEditedStatus] = useState('');
  const [editedCurrency, setEditedCurrency] = useState('USD');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize editable fields when entering edit mode or transaction changes
  useEffect(() => {
    if (transaction) {
      // For create mode, use empty string; for edit/view, use transaction amount as string
      setEditedAmount(mode === 'create' ? '' : String(transaction.amount));
      setEditedStatus(transaction.status);
      setEditedCurrency(transaction.currency);
    }
  }, [transaction, mode]);

  // Set edit mode based on mode prop
  useEffect(() => {
    if (isOpen) {
      setIsEditMode(mode === 'create' || mode === 'edit');
    }
  }, [isOpen, mode]);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditMode(false);
      setSaveSuccess(false);
      setShowJson(false);
      setCopied(false);
    }
  }, [isOpen]);

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Copy transaction ID to clipboard
  const handleCopyId = async () => {
    if (transaction) {
      try {
        await navigator.clipboard.writeText(transaction.transactionId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Get amount color
  const getAmountColor = (amount: number) => {
    return amount >= 0 ? 'text-green-400' : 'text-red-400';
  };

  // Handle amount input change with validation
  const handleAmountChange = (value: string) => {
    // Allow empty string, minus sign, digits, and decimal point
    // This regex allows: "", "-", "123", "123.45", "-123.45", ".", "-." etc.
    if (value === '' || /^-?\.?\d*\.?\d*$/.test(value)) {
      setEditedAmount(value);
    }
  };

  // Toggle amount sign between positive and negative
  const toggleAmountSign = () => {
    if (editedAmount === '' || editedAmount === '-') {
      setEditedAmount('-');
      return;
    }
    
    const numValue = parseFloat(editedAmount);
    if (!isNaN(numValue)) {
      setEditedAmount(String(-numValue));
    }
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!transaction) return;

    setIsSaving(true);
    try {
      // Parse amount string to number, default to 0 if invalid
      const parsedAmount = parseFloat(editedAmount) || 0;
      
      const updatedTransaction = {
        ...transaction,
        amount: parsedAmount,
        status: editedStatus,
        currency: editedCurrency,
        timestamp: mode === 'create' ? new Date().toISOString() : transaction.timestamp,
      };

      const response = await fetch('http://localhost:5143/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTransaction),
      });

      if (!response.ok) {
        throw new Error('Failed to save transaction');
      }

      // Show success notification
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditMode(false);
        onClose(); // Close modal after successful save
      }, 1500);
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Failed to save transaction. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    if (mode === 'create') {
      // For create mode, just close the modal
      onClose();
    } else {
      // For edit mode, revert changes and go back to view
      if (transaction) {
        setEditedAmount(String(transaction.amount));
        setEditedStatus(transaction.status);
        setEditedCurrency(transaction.currency);
      }
      setIsEditMode(false);
    }
  };

  if (!isOpen || !transaction) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">
              {mode === 'create' ? 'Create New Transaction' : isEditMode ? 'Edit Transaction' : 'Transaction Details'}
            </h2>
            {saveSuccess && (
              <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm font-semibold animate-in fade-in duration-200">
                ✓ Saved!
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5">
          {/* Transaction ID Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              Transaction ID
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-slate-800 text-blue-400 px-3 py-2 rounded-lg font-mono break-all">
                {transaction.transactionId}
              </code>
              <button
                onClick={handleCopyId}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <span>✓</span>
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <span>📋</span>
                    <span>Copy ID</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Financials Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="transaction-amount" className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                Amount
              </label>
              {isEditMode ? (
                <div className="relative">
                  <input
                    id="transaction-amount"
                    type="text"
                    value={editedAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0.00"
                    aria-label="Transaction amount"
                    className="w-full bg-slate-800 text-white px-4 py-3 pr-14 rounded-lg text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={toggleAmountSign}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-lg transition-colors"
                    title="Toggle positive/negative"
                    aria-label="Toggle sign"
                  >
                    ±
                  </button>
                </div>
              ) : (
                <div
                  className={`text-3xl font-bold ${getAmountColor(
                    transaction.amount
                  )}`}
                >
                  {transaction.amount >= 0 ? '+' : ''}
                  {transaction.amount.toFixed(2)}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="transaction-currency" className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                Currency
              </label>
              {isEditMode ? (
                <select
                  id="transaction-currency"
                  value={editedCurrency}
                  onChange={(e) => setEditedCurrency(e.target.value)}
                  aria-label="Transaction currency"
                  className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg text-2xl font-bold border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                  <option value="CAD">CAD</option>
                </select>
              ) : (
                <div className="text-3xl font-bold text-white">
                  {transaction.currency}
                </div>
              )}
            </div>
          </div>

          {/* Status Section */}
          <div className="space-y-2">
            <label htmlFor="transaction-status" className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              Status
            </label>
            {isEditMode ? (
              <select
                id="transaction-status"
                value={editedStatus}
                onChange={(e) => setEditedStatus(e.target.value)}
                aria-label="Transaction status"
                className="w-full bg-slate-800 text-white px-4 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Failed">Failed</option>
              </select>
            ) : (
              <div>
                <span
                  className={`inline-flex px-4 py-2 rounded-lg border text-sm font-semibold ${getStatusColor(
                    transaction.status
                  )}`}
                >
                  {transaction.status}
                </span>
              </div>
            )}
          </div>

          {/* Timestamp Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              Timestamp
            </label>
            <div className="text-white bg-slate-800 px-3 py-2 rounded-lg">
              {new Date(transaction.timestamp).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
          </div>

          {/* Raw JSON Inspector */}
          <div className="space-y-2">
            <button
              onClick={() => setShowJson(!showJson)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-400 uppercase tracking-wide hover:text-white transition-colors"
            >
              <span>Raw JSON Inspector</span>
              <svg
                className={`w-5 h-5 transition-transform ${
                  showJson ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showJson && (
              <pre className="bg-slate-950 border border-slate-800 text-green-400 px-4 py-3 rounded-lg text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
                {JSON.stringify(transaction, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-slate-800 flex justify-end gap-3">
          {isEditMode ? (
            <>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className={`px-6 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                  mode === 'create'
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{mode === 'create' ? 'Creating...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'create' ? '🚀' : '💾'}</span>
                    <span>{mode === 'create' ? 'Submit Transaction' : 'Save Changes'}</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditMode(true)}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <span>✏️</span>
                <span>Edit Transaction</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
