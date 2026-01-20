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
  const [broadcastType, setBroadcastType] = useState<'need_help' | 'offer_help'>('need_help');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [locationContext, setLocationContext] = useState<'here_now' | 'heading_to' | 'coming_from' | 'place_specific'>('here_now');
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');

  const loadBroadcasts = async () => {
    setLoadingBroadcasts(true);
    try {
      const { broadcasts: data } = await api.getBroadcasts(
        user?.last_location?.lat || 0,
        user?.last_location?.lng || 0
      );
      setBroadcasts(data);
    } catch (error) {
      console.error('Failed to load broadcasts:', error);
    } finally {
      setLoadingBroadcasts(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadBroadcasts();
    }
  }, [user]);

  const createBroadcast = async () => {
    try {
      await api.createBroadcast(
        broadcastType,
        broadcastMessage,
        selectedDuration,
        locationContext,
        placeName || null,
        placeAddress || null
      );
      await loadBroadcasts();
      setShowBroadcastModal(false);
      setBroadcastMessage('');
      setLocationContext('here_now');
      setPlaceName('');
      setPlaceAddress('');
    } catch (error) {
      console.error('Failed to create broadcast:', error);
      alert('Failed to create broadcast');
    }
  };

  const handleRespond = (broadcast: Broadcast) => {
    // Navigate to a response page - for now, just show alert
    alert(`Response UI coming soon for broadcast: ${broadcast.message}`);
  };

  const handleDelete = async (broadcastId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering click on broadcast card
    try {
      await api.deleteBroadcast(broadcastId);
      await loadBroadcasts();
    } catch (error) {
      console.error('Failed to delete broadcast:', error);
      alert('Failed to delete broadcast');
    }
  };

  const isOwnBroadcast = (broadcast: Broadcast) => {
    return broadcast.requester_id === user?.id;
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
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">NeighborGigs</h1>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                Home
              </button>
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
          {user && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                <span className="font-medium text-gray-900">{user.neighborhood?.name || 'Loading neighborhood...'}</span>
                <span className="mx-2 text-gray-400">•</span>
                <span>{user.radius_miles} mile radius</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Broadcast Button - Centered */}
      {user && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-4">
          <div className="max-w-lg mx-auto flex justify-center">
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="w-full sm:w-auto px-8 bg-blue-600 text-white py-2.5 px-6 rounded-lg font-medium text-sm hover:bg-blue-700 transition shadow-sm"
            >
              Start a Broadcast
            </button>
          </div>
        </div>
      )}

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
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Broadcasts View */}
      {viewMode === 'broadcasts' && (
        <div className="max-w-lg mx-auto px-4 py-4">
          {loadingBroadcasts ? (
            <div className="text-center py-8 text-gray-600">Loading broadcasts...</div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">📢</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No broadcasts yet
              </h2>
              <p className="text-gray-600">
                Be the first! Start a broadcast to offer help or ask for something.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((broadcast) => (
                <div
                  key={broadcast.id}
                  onClick={() => handleRespond(broadcast)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
                          {broadcast.requester?.profile_photo ? (
                            <img
                              src={broadcast.requester.profile_photo}
                              alt={broadcast.requester.first_name || '?'}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg">
                              {broadcast.requester?.first_name?.[0] || '?'}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {broadcast.requester?.first_name || 'Neighbor'}
                          </h3>
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              broadcast.broadcast_type === 'need_help'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {broadcast.broadcast_type === 'need_help' ? 'Need Help' : 'Offering Help'}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-900">{broadcast.message}</p>
                      <div className="text-xs text-gray-500 mt-1">
                        expires {new Date(broadcast.expires_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xs text-gray-500">
                        {new Date(broadcast.created_at).toLocaleString()}
                      </div>
                      {isOwnBroadcast(broadcast) && (
                        <button
                          onClick={(e) => handleDelete(broadcast.id, e)}
                          className="text-red-600 hover:text-red-900 text-xs font-medium"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="px-4 py-4">
          {loadingBroadcasts ? (
            <div className="text-center py-8 text-gray-600">Loading map...</div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <div className="text-4xl mb-2">🗺️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No broadcasts on the map
              </h2>
              <p className="text-gray-600">
                Start a broadcast to see it on the map!
              </p>
            </div>
          ) : (
            <div className="max-w-lg mx-auto">
              <MapView
                broadcasts={broadcasts}
                userLat={user?.last_location?.lat || 0}
                userLng={user?.last_location?.lng || 0}
                userRadiusMiles={user?.radius_miles || 1}
              />
            </div>
          )}
        </div>
      )}

      {/* List View (placeholder for now) */}
      {viewMode === 'list' && (
        <div className="px-4 py-4">
          <div className="text-center py-12 text-gray-600">
            List view coming soon!
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
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setBroadcastType('need_help')}
                type="button"
                className={`flex-1 py-3 px-4 rounded-lg font-medium border-2 transition ${
                  broadcastType === 'need_help'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-900 border-gray-300 hover:border-red-300'
                }`}
              >
                Need Help
              </button>
              <button
                onClick={() => setBroadcastType('offer_help')}
                type="button"
                className={`flex-1 py-3 px-4 rounded-lg font-medium border-2 transition ${
                  broadcastType === 'offer_help'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-900 border-gray-300 hover:border-green-300'
                }`}
              >
                Offering Help
              </button>
            </div>
            <textarea
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder={broadcastType === 'need_help'
                ? 'Need someone with a truck for a quick pickup'
                : 'Heading to grocery store in 15 mins—need anything?'
              }
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 h-24 resize-none"
              maxLength={280}
            />
            {/* Location Context */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
            
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setLocationContext('here_now')}
                  className={`py-2 px-3 rounded-lg font-medium border-2 transition text-sm ${
                    locationContext === 'here_now'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-900 border-gray-300 hover:border-blue-300'
                  }`}
                >
                  📍 Here Now
                </button>
              
                <button
                  type="button"
                  onClick={() => setLocationContext('heading_to')}
                  className={`py-2 px-3 rounded-lg font-medium border-2 transition text-sm ${
                    locationContext === 'heading_to'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-900 border-gray-300 hover:border-blue-300'
                  }`}
                >
                  ➡️ Heading To
                </button>
              
                <button
                  type="button"
                  onClick={() => setLocationContext('coming_from')}
                  className={`py-2 px-3 rounded-lg font-medium border-2 transition text-sm ${
                    locationContext === 'coming_from'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-900 border-gray-300 hover:border-blue-300'
                  }`}
                >
                  ⬅️ Coming From
                </button>
              
                <button
                  type="button"
                  onClick={() => setLocationContext('place_specific')}
                  className={`py-2 px-3 rounded-lg font-medium border-2 transition text-sm ${
                    locationContext === 'place_specific'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-900 border-gray-300 hover:border-blue-300'
                  }`}
                >
                  🏪 Specific Place
                </button>
              </div>
            
              {(locationContext === 'heading_to' ||
                locationContext === 'coming_from' ||
                locationContext === 'place_specific') && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={placeName}
                    onChange={(e) => setPlaceName(e.target.value)}
                    placeholder="Place name (e.g., Trader Joe's)"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                    maxLength={100}
                  />
                
                  <input
                    type="text"
                    value={placeAddress}
                    onChange={(e) => setPlaceAddress(e.target.value)}
                    placeholder="Address (optional)"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                    maxLength={200}
                  />
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How long?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {BROADCAST_DURATION_OPTIONS.map((duration) => (
                  <button
                    key={duration}
                    onClick={() => setSelectedDuration(duration)}
                    type="button"
                    className={`py-2 px-3 rounded-lg font-medium border-2 transition text-sm ${
                      selectedDuration === duration
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-900 border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {duration} min
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBroadcastModal(false);
                  setLocationContext('here_now');
                  setPlaceName('');
                  setPlaceAddress('');
                }}
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
