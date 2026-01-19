import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client';

const TIP_PRESETS = [5, 10, 15, 20] as const;

export default function RequestHelp() {
  const { helperId } = useParams<{ helperId: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
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
    if (!helperId || !message.trim() || !selectedTip) {
      setError('Please fill in all fields');
      return;
    }

    setSending(true);
    setError(null);

    try {
      await api.createRequest({
        helper_id: helperId,
        message: message.trim(),
        suggested_tip_usd: selectedTip,
      });
      navigate('/task');
    } catch (error: any) {
      setError(error?.message || 'Failed to send request');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3">
          <button
            onClick={() => navigate('/home')}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Cancel
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Request Help
        </h1>
        <p className="text-gray-600 mb-6">
          Send a request to {loadingHelper ? 'Loading...' : helper?.first_name || 'a helper'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What do you need help with?
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={280}
              rows={4}
              placeholder="Describe your request..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {message.length}/280 characters
            </p>
          </div>

          {/* Tip Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Suggested Tip
            </label>
            <div className="grid grid-cols-4 gap-3">
              {TIP_PRESETS.map((tip) => (
                <button
                  key={tip}
                  onClick={() => setSelectedTip(tip)}
                  type="button"
                  className={`py-3 px-4 rounded-lg font-medium border-2 transition ${
                    selectedTip === tip
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-900 border-gray-300 hover:border-blue-300'
                  }`}
                >
                  ${tip}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={sending || !message.trim() || !selectedTip}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? 'Sending Request...' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
