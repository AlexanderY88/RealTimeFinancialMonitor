import { useState } from 'react';
import type { Transaction, TransactionStatus } from '../types';

const BACKEND_API_URL = 'http://localhost:5143/api/transactions';
const CURRENCIES = ['USD', 'EUR', 'ILS', 'GBP'] as const;
const STATUSES: TransactionStatus[] = ['Pending', 'Completed', 'Failed'];

function Simulator() {
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState<string>('');
  
  // Form state
  const [formData, setFormData] = useState<{
    transactionId: string;
    amount: string;
    currency: string;
    status: TransactionStatus;
  }>({
    transactionId: crypto.randomUUID(),
    amount: '',
    currency: 'USD',
    status: 'Pending',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<string>('');

  const generateRandomTransaction = (): Transaction => {
    // Generate random amount between -500.00 and 5000.00
    const amount = Math.round((Math.random() * 5500 - 500) * 100) / 100;
    
    // Pick random currency
    const currency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
    
    // Pick random status
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    
    return {
      transactionId: crypto.randomUUID(),
      amount,
      currency,
      status,
      timestamp: new Date().toISOString()
    };
  };

  const sendTransaction = async (transaction: Transaction): Promise<void> => {
    const response = await fetch(BACKEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  };

  const handleSeedRandomBurst = async () => {
    if (isSending) return;

    // Generate random count between 1 and 100
    const count = Math.floor(Math.random() * 100) + 1;
    
    setIsSending(true);
    setProgress(`Generating ${count} transactions...`);
    
    try {
      // Generate all transactions
      const transactions = Array.from({ length: count }, () => generateRandomTransaction());
      
      setProgress(`Sending ${count} transactions...`);
      
      // Send transactions with a small delay to simulate live stream
      let sent = 0;
      for (const transaction of transactions) {
        await sendTransaction(transaction);
        sent++;
        
        if (sent % 10 === 0 || sent === count) {
          setProgress(`Sent ${sent}/${count} transactions...`);
        }
        
        // Small delay between requests (10-20ms random)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 10));
      }
      
      setProgress(`✅ Successfully sent ${count} transactions!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setProgress('');
      }, 3000);
      
    } catch (error) {
      console.error('Error sending transactions:', error);
      setProgress(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setProgress('');
      }, 5000);
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateNewId = () => {
    setFormData({ ...formData, transactionId: crypto.randomUUID() });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Validate amount
    const amount = parseFloat(formData.amount);
    if (isNaN(amount)) {
      setFormMessage('❌ Please enter a valid amount');
      setTimeout(() => setFormMessage(''), 3000);
      return;
    }
    
    setIsSubmitting(true);
    setFormMessage('Sending transaction...');
    
    try {
      const transaction: Transaction = {
        transactionId: formData.transactionId,
        amount,
        currency: formData.currency,
        status: formData.status,
        timestamp: new Date().toISOString(),
      };
      
      const response = await fetch(BACKEND_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Check response status
      if (response.status === 201) {
        setFormMessage('✅ Created new transaction!');
      } else if (response.status === 200) {
        setFormMessage('ℹ️ Updated existing transaction!');
      } else {
        setFormMessage('✅ Transaction sent successfully!');
      }
      
      // Reset form with new ID
      setFormData({
        transactionId: crypto.randomUUID(),
        amount: '',
        currency: 'USD',
        status: 'Pending',
      });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setFormMessage('');
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting transaction:', error);
      setFormMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setFormMessage('');
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
          Transaction Simulator
        </h2>
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl">
          Generate and send mock transactions to test the real-time monitoring system
        </p>
      </div>
      
      {/* Two-Column Layout for larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Manual Transaction Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>📝</span>
            Create / Update Transaction
          </h3>
          <p className="text-slate-400 mb-6">
            Manually create a new transaction or update an existing one by ID.
          </p>
          
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Transaction ID Field */}
            <div>
              <label htmlFor="transactionId" className="block text-sm font-medium text-slate-300 mb-2">
                Transaction ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="transactionId"
                  value={formData.transactionId}
                  onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                  className="flex-1 bg-slate-950 text-white border border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                  placeholder="Enter UUID"
                  required
                />
                <button
                  type="button"
                  onClick={handleGenerateNewId}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-1 border border-slate-700"
                  title="Generate New ID"
                >
                  <span className="text-lg">🎲</span>
                  <span className="hidden sm:inline text-sm">New ID</span>
                </button>
              </div>
            </div>
            
            {/* Amount Field */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-2">
                Amount
              </label>
              <input
                type="number"
                id="amount"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-slate-950 text-white border border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g., 150.50 or -25.00"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Supports negative and positive values</p>
            </div>
            
            {/* Currency Field */}
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-slate-300 mb-2">
                Currency
              </label>
              <select
                id="currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full bg-slate-950 text-white border border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              >
                {CURRENCIES.map((curr) => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
            </div>
            
            {/* Status Field */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-300 mb-2">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TransactionStatus })}
                className="w-full bg-slate-950 text-white border border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              >
                {STATUSES.map((stat) => (
                  <option key={stat} value={stat}>{stat}</option>
                ))}
              </select>
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`
                w-full bg-gradient-to-r from-indigo-600 to-blue-600 
                hover:from-indigo-500 hover:to-blue-500
                text-white font-bold py-3 px-6 rounded-lg 
                shadow-lg transition-all
                ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'}
                flex items-center justify-center gap-2
              `}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <span>📤</span>
                  Submit Transaction
                </>
              )}
            </button>
            
            {/* Form Message */}
            {formMessage && (
              <div className={`
                px-4 py-3 rounded-lg font-medium text-sm text-center
                ${formMessage.startsWith('✅') ? 'bg-green-900/50 text-green-300 border border-green-700' : 
                  formMessage.startsWith('❌') ? 'bg-red-900/50 text-red-300 border border-red-700' : 
                  formMessage.startsWith('ℹ️') ? 'bg-blue-900/50 text-blue-300 border border-blue-700' :
                  'bg-indigo-900/50 text-indigo-300 border border-indigo-700'}
                animate-fade-in
              `}>
                {formMessage}
              </div>
            )}
          </form>
        </div>
        
        {/* Random Burst Generator */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col h-full">
            <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <span>🎲</span>
              Random Transaction Burst
            </h3>
            <p className="text-slate-400 mb-6">
              Generate and send a random batch of 1-100 transactions with randomized amounts, currencies, and statuses.
            </p>
            
            <div className="flex-1 flex flex-col justify-center items-center space-y-4">
              <button
                onClick={handleSeedRandomBurst}
                disabled={isSending}
                className={`
                  bg-gradient-to-r from-purple-600 to-indigo-600 
                  hover:from-purple-500 hover:to-indigo-500
                  text-white font-bold py-4 px-8 rounded-xl 
                  shadow-lg transition-all transform
                  ${isSending ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
                  flex items-center gap-3 text-lg
                `}
              >
                <span className="text-2xl">🎲</span>
                <span>{isSending ? 'Sending...' : 'Seed Random Burst'}</span>
              </button>
              
              <p className="text-slate-500 text-sm">1-100 Transactions</p>
              
              {/* Progress Indicator */}
              {progress && (
                <div className={`
                  w-full px-6 py-3 rounded-lg font-medium text-sm text-center
                  ${progress.startsWith('✅') ? 'bg-green-900/50 text-green-300 border border-green-700' : 
                    progress.startsWith('❌') ? 'bg-red-900/50 text-red-300 border border-red-700' : 
                    'bg-indigo-900/50 text-indigo-300 border border-indigo-700'}
                  animate-fade-in
                `}>
                  {progress}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Simulator
