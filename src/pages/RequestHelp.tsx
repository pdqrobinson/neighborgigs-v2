import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { api } from '../lib/api-client';

export default function RequestHelp() {
  const { helperId } = useParams<{ helperId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helper, setHelper] = useState<{ first_name: string; profile_photo: string | null } | null>(null);
  const [loadingHelper, setLoadingHelper] = useState(true);

  // Fetch helper details
  useEffect(() => {
    if (!helperId) {
      navigate('/home');
      return;
    }

    const loadHelper = async () => {
      try {
        const { helpers } = await api.getNearbyHelpers(0, 0); // Location doesn't matter, we just want helper info
        const foundHelper = helpers?.find(h => h.user_id === helperId);
        if (foundHelper) {
          setHelper({ first_name: foundHelper.first_name, profile_photo: foundHelper.profile_photo });
        }
      } catch (err) {
        console.error('Failed to load helper:', err);
        setError('Could not load helper information');
      } finally {
        setLoadingHelper(false);
      }
    };

    loadHelper();
  }, [helperId, navigate]);

  const handleSubmit = async () => {
    if (!helperId || !message.trim()) {
      setError('Please enter a message');
      return;
    }
    
    setSending(true);
    setError(null);

    try {
      await api.createRequest(
        helperId,
        message.trim()
      );
      navigate('/task');
    } catch (error: any) {
      setError(error?.message || 'Failed to send request');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <button
            onClick={() => navigate('/home')}
            className="text-primary hover:text-primary/80"
          >
            ← Cancel
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Request Help
        </h1>
        <p className="text-muted-foreground mb-8">
          Send a request to {loadingHelper ? 'Loading...' : helper?.first_name || 'a helper'}
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-lg border bg-destructive/10 border-destructive/20 text-destructive">
            {error}
          </div>
        )}

        <div className="bg-card rounded-lg shadow-sm border border-border p-6 space-y-8">
          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              What do you need help with?
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={280}
              rows={4}
              placeholder="Describe your request..."
              className="w-full border border-input rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {message.length}/280 characters
            </p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={sending || !message.trim()}
            className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending Request...' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
