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
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-foreground">NeighborGigs</h1>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                Home
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                Profile
              </button>
              <button
                onClick={() => navigate('/wallet')}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                Wallet
              </button>
            </div>
          </div>
          {user && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">{user.neighborhood?.name || 'Loading neighborhood...'}</span>
                <span className="mx-2 text-muted-foreground/50">•</span>
                <span>{user.radius_miles} mile radius</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Broadcast Button - Centered */}
      {user && (
        <div className="bg-muted/30 border-b border-border px-4 py-6">
          <div className="max-w-lg mx-auto flex justify-center">
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="bg-primary text-primary-foreground py-3 px-8 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm hover:shadow-md"
            >
              Start a Broadcast
            </button>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="max-w-lg mx-auto px-4 py-4 flex justify-center">
        <div className="bg-muted rounded-lg p-1 flex">
          <button
            onClick={() => setViewMode('broadcasts')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'broadcasts' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Broadcasts
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'map' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
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
            <div className="text-center py-10 text-muted-foreground">Loading broadcasts...</div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">📢</div>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                No broadcasts yet
              </h2>
              <p className="text-muted-foreground">
                Be first! Start a broadcast to offer help or ask for something.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {broadcasts.map((broadcast) => (
                <div
                  key={broadcast.id}
                  onClick={() => handleRespond(broadcast)}
                  className="bg-card rounded-lg shadow-sm border border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
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
                          <h3 className="font-semibold text-foreground">
                            {broadcast.requester?.first_name || 'Neighbor'}
                          </h3>
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                              broadcast.broadcast_type === 'need_help'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-green-600/10 text-green-700'
                            }`}
                          >
                            {broadcast.broadcast_type === 'need_help' ? 'Need Help' : 'Offering Help'}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-foreground mb-2">{broadcast.message}</p>
                      <div className="text-xs text-muted-foreground">
                        expires {new Date(broadcast.expires_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <div className="text-xs text-muted-foreground">
                        {new Date(broadcast.created_at).toLocaleString()}
                      </div>
                      {isOwnBroadcast(broadcast) && (
                        <button
                          onClick={(e) => handleDelete(broadcast.id, e)}
                          className="text-destructive hover:text-destructive/90 text-xs font-medium"
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
            <div className="text-center py-10 text-muted-foreground">Loading map...</div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-4xl mb-4">🗺️</div>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                No broadcasts on the map
              </h2>
              <p className="text-muted-foreground">
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
          <div className="text-center py-16 text-muted-foreground">
            List view coming soon!
          </div>
        </div>
      )}

      {/* Broadcast Create Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold text-foreground mb-6">
              Start a Broadcast
            </h2>
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setBroadcastType('need_help')}
                type="button"
                className={`flex-1 py-3 px-4 rounded-lg font-medium border-2 transition-colors ${
                  broadcastType === 'need_help'
                    ? 'bg-destructive text-destructive-foreground border-destructive'
                    : 'bg-card text-foreground border-border hover:border-destructive/50'
                }`}
              >
                Need Help
              </button>
              <button
                onClick={() => setBroadcastType('offer_help')}
                type="button"
                className={`flex-1 py-3 px-4 rounded-lg font-medium border-2 transition-colors ${
                  broadcastType === 'offer_help'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-card text-foreground border-border hover:border-green-600/50'
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
              className="w-full border border-input rounded-lg px-4 py-3 mb-6 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={280}
            />
            {/* Location Context */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-3">
                Location
              </label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setLocationContext('here_now')}
                  className={`py-3 px-4 rounded-lg font-medium border-2 transition-colors text-sm ${
                    locationContext === 'here_now'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:border-primary/50'
                  }`}
                >
                  📍 Here Now
                </button>
                <button
                  type="button"
                  onClick={() => setLocationContext('heading_to')}
                  className={`py-3 px-4 rounded-lg font-medium border-2 transition-colors text-sm ${
                    locationContext === 'heading_to'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:border-primary/50'
                  }`}
                >
                  ➡️ Heading To
                </button>
                <button
                  type="button"
                  onClick={() => setLocationContext('coming_from')}
                  className={`py-3 px-4 rounded-lg font-medium border-2 transition-colors text-sm ${
                    locationContext === 'coming_from'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:border-primary/50'
                  }`}
                >
                  ⬅️ Coming From
                </button>
                <button
                  type="button"
                  onClick={() => setLocationContext('place_specific')}
                  className={`py-3 px-4 rounded-lg font-medium border-2 transition-colors text-sm ${
                    locationContext === 'place_specific'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:border-primary/50'
                  }`}
                >
                  🏪 Specific Place
                </button>
              </div>
              {(locationContext === 'heading_to' ||
                locationContext === 'coming_from' ||
                locationContext === 'place_specific') && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={placeName}
                    onChange={(e) => setPlaceName(e.target.value)}
                    placeholder="Place name (e.g., Trader Joe's)"
                    className="w-full border border-input rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    maxLength={100}
                  />
                  <input
                    type="text"
                    value={placeAddress}
                    onChange={(e) => setPlaceAddress(e.target.value)}
                    placeholder="Address (optional)"
                    className="w-full border border-input rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    maxLength={200}
                  />
                </div>
              )}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-3">
                How long?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {BROADCAST_DURATION_OPTIONS.map((duration) => (
                  <button
                    key={duration}
                    onClick={() => setSelectedDuration(duration)}
                    type="button"
                    className={`py-3 px-4 rounded-lg font-medium border-2 transition-colors text-sm ${
                      selectedDuration === duration
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {duration} min
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowBroadcastModal(false);
                  setLocationContext('here_now');
                  setPlaceName('');
                  setPlaceAddress('');
                }}
                className="flex-1 bg-secondary text-secondary-foreground py-2.5 px-4 rounded-lg font-medium hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createBroadcast}
                disabled={!broadcastMessage.trim()}
                className="flex-1 bg-primary text-primary-foreground py-2.5 px-4 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
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
