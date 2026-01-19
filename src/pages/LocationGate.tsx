import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { api } from '../lib/api-client';

export default function LocationGate() {
  const navigate = useNavigate();
  const { user, loading, setLocation } = useUser();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (user?.neighborhood?.id) {
      navigate('/home');
      return;
    }

    const requestLocation = async () => {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });

        const { latitude, longitude } = position.coords;
        await setLocation(latitude, longitude);

        // Auto-assign neighborhood
        await api.updateNeighborhood(latitude, longitude);

        navigate('/home');
      } catch (err) {
        setError('Location permission required to use NeighborGigs');
      }
    };

    requestLocation();
  }, [user, loading, setLocation, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          NeighborGigs
        </h1>
        <p className="text-gray-600 mb-6">
          Location permission is required to see nearby neighbors and request help.
        </p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Enable Location
        </button>
      </div>
    </div>
  );
}
