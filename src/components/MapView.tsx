import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { NearbyHelper } from '../lib/api-client';

// Fix default marker icon issue with Leaflet + React
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  helpers: NearbyHelper[];
  userLat: number;
  userLng: number;
  userRadiusMiles: number;
}

function MapController({ userLat, userLng, userRadiusMiles }: { userLat: number; userLng: number; userRadiusMiles: number }) {
  const map = useMap();

  React.useEffect(() => {
    map.setView([userLat, userLng], 13);
  }, [map, userLat, userLng]);

  return null;
}

export default function MapView({ helpers, userLat, userLng, userRadiusMiles }: MapViewProps) {
  if (!userLat || !userLng) {
    return (
      <div className="h-96 bg-gray-200 flex items-center justify-center">
        <div className="text-gray-600 text-center">
          <div className="text-4xl mb-2">📍</div>
          <p>Location not available</p>
        </div>
      </div>
    );
  }

  // Convert miles to meters for Leaflet
  const radiusMeters = userRadiusMiles * 1609.34;

  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={13}
      style={{ height: '400px', width: '100%' }}
      className="rounded-lg shadow-sm"
    >
      <MapController userLat={userLat} userLng={userLng} userRadiusMiles={userRadiusMiles} />

      {/* OpenStreetMap tiles */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* User's radius circle */}
      <Circle
        center={[userLat, userLng]}
        radius={radiusMeters}
        pathOptions={{
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 2,
        }}
      />

      {/* User location marker */}
      <Marker position={[userLat, userLng]}>
        <Popup>You are here</Popup>
      </Marker>

      {/* Helper markers */}
      {helpers.map((helper) => (
        <Marker
          key={helper.user_id}
          position={[helper.last_location.lat, helper.last_location.lng]}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-gray-900">{helper.first_name}</h3>
              <p className="text-sm text-gray-600">
                {helper.direction === 'out' ? 'Going out' : 'Heading home'}
              </p>
              <p className="text-sm text-gray-600">
                {helper.distance_miles.toFixed(1)} miles away
              </p>
              <p className="text-xs text-gray-500">
                until {new Date(helper.expires_at).toLocaleTimeString()}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
