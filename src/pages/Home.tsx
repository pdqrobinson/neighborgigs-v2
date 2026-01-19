import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { api, type Broadcast } from '../lib/api-client';
import MapView from '../components/MapView';

const BROADCAST_DURATION_OPTIONS = [15, 30, 60, 120] as const;

export default function Home() {
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const [viewMode, setViewMode] = useState<'broadcasts' | 'map' | 'list'>('broadcasts');
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [selectedBroadcastType, setSelectedBroadcastType] = useState<'need_help' | 'offer_help'>('offer_help');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<number>(30);

  const loadBroadcasts = async () => {
    setLoadingBroadcasts(true);
    try {
      const { broadcasts: data } = await api.getBroadcasts();
      setBroadcasts(data);
    } catch (error) {
      console.error('Failed to load broadcasts:', error);
    } finally {
      setLoadingBroadcasts(false);
    }
  };

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const openBroadcastModal = () => {
    setShowBroadcastModal(true);
    setBroadcastMessage('');
    setSelectedDuration(30);
  };

  const createBroadcast = async () => {
    if (!broadcastMessage.trim()) return;

    try {
      await api.createBroadcast(selectedBroadcastType, broadcastMessage, selectedDuration);
      setShowBroadcastModal(false);
      await loadBroadcasts();
    } catch (error) {
      console.error('Failed to create broadcast:', error);
    }
  };

  const respondToBroadcast = async (broadcastId: string) => {
    const tip = prompt('Tip amount ($5, $10, $15, or $20):', '10');
    if (!tip) return;

    const tipAmount = parseInt(tip);
    if (![5, 10, 15, 20].includes(tipAmount)) {
      alert('Tip must be $5, $10, $15, or $20');
      return;
    }

    try {
      await api.respondToBroadcast(broadcastId, tipAmount);
      alert('Response sent! Wait for them to accept.');
      navigate('/active-task');
    } catch (error) {
      console.error('Failed to respond to broadcast:', error);
      alert('Failed to send response');
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">NeighborGigs</h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/profile')}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              Profile
            </button>
            <button
              onClick={() => navigate('/wallet')}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              Wallet
            </button>
          </div>
        </div>
      </div>

      {/* Location & Neighborhood Info */}
      {user && (
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="max-w-lg mx-auto text-sm text-gray-600">
            <span>{user.neighborhood?.name || 'Loading neighborhood...'}</span>
            <span className="mx-2">•</span>
            <span>{user.radius_miles} mile radius</span>
          </div>
        </div>
      )}

      {/* Main Action Button */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <button
          onClick={openBroadcastModal}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700"
        >
          Start a Broadcast
        </button>
      </div>

      {/* View Toggle */}
      <div className="max-w-lg mx-auto px-4 py-3 flex justify-center">
        <div className="bg-gray-200 rounded-lg p-1 flex">
          <button
            onClick={() => setViewMode('broadcasts')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'broadcasts' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
            }`}
          >
            Broadcasts
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'map' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
            }`}
          >
            Map
          </button>
        </div>
      </div>

      {/* Broadcasts Feed */}
      {viewMode === 'broadcasts' && (
        <div className="max-w-lg mx-auto px-4 py-4">
          {loadingBroadcasts ? (
            <div className="text-center py-8 text-gray-600">Loading broadcasts...</div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">📢</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No broadcasts right now
              </h2>
              <p className="text-gray-600">
                Be the first to broadcast to your neighborhood!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((broadcast) => {
                const isExpired = new Date(broadcast.expires_at) < new Date();
                return (
                  <div
                    key={broadcast.id}
                    className={`bg-white rounded-lg shadow-sm border p-4 ${
                      isExpired ? 'border-gray-300 opacity-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          broadcast.broadcast_type === 'need_help'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {broadcast.broadcast_type === 'need_help' ? 'Need Help' : 'Offering Help'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(broadcast.expires_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <p className="text-gray-900 mb-3">{broadcast.message}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {broadcast.requester?.profile_photo ? (
                          <img
                            src={broadcast.requester.profile_photo}
                            alt={broadcast.requester.first_name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs">
                            {broadcast.requester?.first_name[0]}
                          </div>
                        )}
                        <span className="text-sm text-gray-600">{broadcast.requester?.first_name}</span>
                      </div>
                      {!isExpired && broadcast.requester_id !== '00000000-0000-0000-0000-000000000001' && (
                        <button
                          onClick={() => respondToBroadcast(broadcast.id)}
                          className="bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700"
                        >
                          Respond
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Map View - show message to use Broadcasts */}
      {viewMode === 'map' && (
        <div className="px-4 py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">📍</div>
            <p className="text-gray-700">
              Map view for broadcasts coming soon! Use the Broadcasts feed for now.
            </p>
          </div>
        </div>
      )}

      {/* Broadcast Create Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Start a Broadcast
            </h2>
            <p className="text-gray-600 mb-4">
              What do you need or can you help with?
            </p>
            
            {/* Type Toggle */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setSelectedBroadcastType('need_help')}
                type="button"
                className={`py-3 px-4 rounded-lg font-medium border-2 transition ${
                  selectedBroadcastType === 'need_help'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-900 border-gray-300 hover:border-red-300'
                }`}
              >
                Need Help
              </button>
              <button
                onClick={() => setSelectedBroadcastType('offer_help')}
                type="button"
                className={`py-3 px-4 rounded-lg font-medium border-2 transition ${
                  selectedBroadcastType === 'offer_help'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-900 border-gray-300 hover:border-green-300'
                }`}
              >
                Offering Help
              </button>
            </div>

            {/* Message Input */}
            <div className="mb-4">
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder={
                  selectedBroadcastType === 'offer_help'
                    ? "Heading to Fry's in 15 mins, need anything?"
                    : "Need someone with a truck for a quick pickup"
                }
                className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none"
                rows={3}
                maxLength={280}
              />
              <div className="text-xs text-gray-500 text-right mt-1">
                {broadcastMessage.length}/280
              </div>
            </div>

            {/* Duration Selection */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">
                How long should this broadcast be active?
              </p>
              <div className="grid grid-cols-4 gap-2">
                {BROADCAST_DURATION_OPTIONS.map((duration) => (
                  <button
                    key={duration}
                    onClick={() => setSelectedDuration(duration)}
                    type="button"
                    className={`py-2 px-2 rounded-lg font-medium text-sm border-2 transition ${
                      selectedDuration === duration
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-900 border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {duration}m
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="flex-1 bg-gray-200 text-gray-900 py-2 px-4 rounded-lg font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={createBroadcast}
                disabled={!broadcastMessage.trim()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                Broadcast
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
