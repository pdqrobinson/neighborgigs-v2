import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Broadcast } from '../lib/api-client';

// Fix default marker icon issue with Leaflet + React
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  broadcasts: Broadcast[];
  userLat: number;
  userLng: number;
  userRadiusMiles: number;
}

function MapController({ userLat, userLng, userRadiusMiles }: { userLat: number; userLng: number; userRadiusMiles: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([userLat, userLng], 13);
  }, [map, userLat, userLng]);

  return null;
}

export default function MapView({ broadcasts, userLat, userLng, userRadiusMiles }: MapViewProps) {
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

      {/* Broadcast markers */}
      {broadcasts
        .filter((b) => b.last_lat && b.last_lng)
        .map((broadcast) => (
          <Marker
            key={broadcast.id}
            position={[broadcast.last_lat!, broadcast.last_lng!]}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {broadcast.requester?.first_name || 'Neighbor'}
                </h3>
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${
                    broadcast.broadcast_type === 'need_help'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {broadcast.broadcast_type === 'need_help' ? 'Need Help' : 'Offering Help'}
                </span>
                <p className="text-sm text-gray-900 mb-1">{broadcast.message || broadcast.description}</p>
                <p className="text-xs text-gray-500 mb-3">
                  expires {new Date(broadcast.expires_at).toLocaleTimeString()}
                </p>
                <button
                  onClick={() => window.location.href = `/broadcasts/${broadcast.id}/respond`}
                  className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700"
                >
                  Respond
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
