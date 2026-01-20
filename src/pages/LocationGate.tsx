import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { api } from '../lib/api-client';

const DEMO_LOCATION = { lat: 33.4484, lng: -112.0740 };

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
  }, [user, loading, navigate]);

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

      await api.updateNeighborhood(latitude, longitude);
      navigate('/home');
    } catch (err) {
      setError('Location permission required to use NeighborGigs');
    }
  };

  const useDemoMode = async () => {
    try {
      await setLocation(DEMO_LOCATION.lat, DEMO_LOCATION.lng);
      await api.updateNeighborhood(DEMO_LOCATION.lat, DEMO_LOCATION.lng);
      navigate('/home');
    } catch (err) {
      setError('Failed to initialize demo mode');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-md p-8 text-center">
        <h1 className="text-3xl font-bold text-foreground mb-6">
          NeighborGigs
        </h1>
        <p className="text-muted-foreground mb-8">
          Location permission is required to see nearby neighbors and request help.
        </p>
        {error && (
          <div className="mb-6 p-4 rounded-lg border bg-destructive/10 border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <button
            onClick={requestLocation}
            className="w-full bg-primary text-primary-foreground py-4 px-6 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Enable Location
          </button>
          <button
            onClick={useDemoMode}
            className="w-full bg-secondary text-secondary-foreground py-4 px-6 rounded-lg font-medium hover:bg-secondary/80 transition-colors"
          >
            Demo Mode
          </button>
        </div>
      </div>
    </div>
  );
}
