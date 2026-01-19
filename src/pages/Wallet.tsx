import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { api, type LedgerEntry } from '../lib/api-client';

export default function Wallet() {
  const navigate = useNavigate();
  const { wallet, loading } = useUser();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadLedger = async () => {
    setLoadingEntries(true);
    try {
      const { entries: data } = await api.getLedgerEntries();
      setEntries(data);
    } catch (error) {
      console.error('Failed to load ledger:', error);
    } finally {
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, []);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }

    if (amount > (wallet?.available_usd || 0)) {
      setMessage({ type: 'error', text: 'Insufficient funds' });
      return;
    }

    setWithdrawing(true);
    setMessage(null);

    try {
      await api.requestWithdrawal(amount);
      await api.getWallet();
      await loadLedger();
      setWithdrawAmount('');
      setMessage({ type: 'success', text: 'Withdrawal successful' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Withdrawal failed' });
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3">
          <button
            onClick={() => navigate('/home')}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Wallet</h1>

        {message && (
          <div
            className={`mb-4 p-3 rounded ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Balance Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-600 mb-2">Available Balance</h2>
          <div className="text-4xl font-bold text-gray-900 mb-4">
            ${(wallet?.available_usd || 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">
            Pending: ${(wallet?.pending_usd || 0).toFixed(2)} USD
          </div>
        </div>

        {/* Withdrawal Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Withdrawal</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (USD)
            </label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              min="0.01"
              step="0.01"
              max={wallet?.available_usd || 0}
              placeholder="25.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-600 mt-1">
              Available: ${(wallet?.available_usd || 0).toFixed(2)} USD
            </p>
          </div>
          <button
            onClick={handleWithdraw}
            disabled={withdrawing || !withdrawAmount}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {withdrawing ? 'Processing...' : 'Withdraw'}
          </button>
        </div>

        {/* Ledger History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h2>
          {loadingEntries ? (
            <div className="text-center py-4 text-gray-600">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              No transactions yet
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex justify-between items-start border-b border-gray-100 pb-3 last:border-b-0"
                >
                  <div>
                    <p className="font-medium text-gray-900 capitalize">
                      {entry.source}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(entry.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      entry.entry_type === 'credit'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {entry.entry_type === 'credit' ? '+' : '-'}
                    ${entry.amount_usd.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
