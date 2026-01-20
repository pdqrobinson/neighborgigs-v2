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
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/home')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-8">Wallet</h1>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-destructive/10 border border-destructive/20 text-destructive'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Balance Card */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-8 mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Available Balance</h2>
          <div className="text-4xl font-bold text-foreground mb-4">
            ${(wallet?.available_usd || 0).toFixed(2)}
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>Total (ledger): ${(wallet?.ledger_usd || 0).toFixed(2)} USD</div>
            <div>Held (reserved): ${(wallet?.held_usd || 0).toFixed(2)} USD</div>
          </div>
        </div>

        {/* Withdrawal Form */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-6">Request Withdrawal</h2>
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-3">
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
              className="w-full border border-input rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Available: ${(wallet?.available_usd || 0).toFixed(2)} USD
            </p>
          </div>
          <button
            onClick={handleWithdraw}
            disabled={withdrawing || !withdrawAmount}
            className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {withdrawing ? 'Processing...' : 'Withdraw'}
          </button>
        </div>

        {/* Ledger History */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">Transaction History</h2>
          {loadingEntries ? (
            <div className="text-center py-6 text-muted-foreground">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No transactions yet
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex justify-between items-start border-b border-border pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground capitalize">
                      {entry.source}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {entry.status === 'completed' ? '✓ Completed' : entry.status === 'pending' ? '⏳ Pending' : '✗ Failed'}
                    </div>
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      entry.type === 'credit'
                        ? 'text-green-600'
                        : entry.type === 'debit'
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {entry.type === 'credit' ? '+' : entry.type === 'debit' ? '-' : ''}
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
