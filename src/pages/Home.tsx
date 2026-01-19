import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { api, type NearbyHelper } from '../lib/api-client';
import MapView from '../components/MapView';

const DURATION_OPTIONS = [30, 60, 90, 120] as const;

export default function Home() {
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [helpers, setHelpers] = useState<NearbyHelper[]>([]);
  const [loadingHelpers, setLoadingHelpers] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(60);

  const loadNearbyHelpers = async () => {
    if (!user?.last_location) return;

    setLoadingHelpers(true);
    try {
      const { helpers: data } = await api.getNearbyHelpers(
        user.last_location.lat,
        user.last_location.lng
      );
      setHelpers(data);
    } catch (error) {
      console.error('Failed to load helpers:', error);
    } finally {
      setLoadingHelpers(false);
    }
  };

  useEffect(() => {
    if (user?.last_location) {
      loadNearbyHelpers();
    }
  }, [user]);

  const openMovementModal = () => {
    setShowMovementModal(true);
  };

  const startMovement = async () => {
    try {
      await api.startMovement('out', selectedDuration);
      await api.getMe();
      setShowMovementModal(false);
      navigate(0);
    } catch (error) {
      console.error('Failed to start movement:', error);
    }
  };

  const stopMovement = async () => {
    try {
      await api.stopMovement();
      await api.getMe();
      navigate(0);
    } catch (error) {
      console.error('Failed to stop movement:', error);
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

      {/* Location & Movement Info */}
      {user && (
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="max-w-lg mx-auto text-sm text-gray-600">
            <span>{user.neighborhood?.name || 'Loading neighborhood...'}</span>
            <span className="mx-2">•</span>
            <span>{user.radius_miles} mile radius</span>
            {user.movement.on_the_move && (
              <>
                <span className="mx-2">•</span>
                <span className="text-green-600">
                  {user.movement.direction === 'out' ? 'Going out' : 'Heading home'}
                </span>
                <span className="mx-1">
                  ({new Date(user.movement.expires_at!).toLocaleTimeString()})
                </span>
              </>
            )}
          </div>
          {user.movement.on_the_move ? (
            <button
              onClick={stopMovement}
              className="mt-2 w-full max-w-lg bg-red-600 text-white py-2 px-4 rounded text-sm hover:bg-red-700"
            >
              Stop Being Visible
            </button>
          ) : (
            <button
              onClick={openMovementModal}
              className="mt-2 w-full max-w-lg bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700"
            >
              Go On The Move
            </button>
          )}
        </div>
      )}

      {/* View Toggle */}
      <div className="max-w-lg mx-auto px-4 py-3 flex justify-center">
        <div className="bg-gray-200 rounded-lg p-1 flex">
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

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="px-4 py-4">
          <MapView
            helpers={helpers}
            userLat={user?.last_location?.lat || 0}
            userLng={user?.last_location?.lng || 0}
            userRadiusMiles={user?.radius_miles || 1}
          />
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="max-w-lg mx-auto px-4 py-4">
          {loadingHelpers ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : helpers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">🏘️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No one nearby right now
              </h2>
              <p className="text-gray-600">
                Come back later or go on the move yourself to help neighbors!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {helpers.map((helper) => (
                <div
                  key={helper.user_id}
                  onClick={() => navigate(`/request/${helper.user_id}`)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
                          {helper.profile_photo ? (
                            <img
                              src={helper.profile_photo}
                              alt={helper.first_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg">{helper.first_name[0]}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{helper.first_name}</h3>
                          <p className="text-sm text-gray-600">
                            {helper.direction === 'out' ? 'Going out' : 'Heading home'}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {helper.distance_miles.toFixed(1)} miles away
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      until {new Date(helper.expires_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Movement Duration Modal */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Go On The Move
            </h2>
            <p className="text-gray-600 mb-4">
              How long will you be available to help?
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {DURATION_OPTIONS.map((duration) => (
                <button
                  key={duration}
                  onClick={() => setSelectedDuration(duration)}
                  type="button"
                  className={`py-3 px-4 rounded-lg font-medium border-2 transition ${
                    selectedDuration === duration
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-900 border-gray-300 hover:border-blue-300'
                  }`}
                >
                  {duration} min
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMovementModal(false)}
                className="flex-1 bg-gray-200 text-gray-900 py-2 px-4 rounded-lg font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={startMovement}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
