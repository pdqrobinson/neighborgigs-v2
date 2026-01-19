import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { api } from '../lib/api-client';

export default function Profile() {
  const { user, loading } = useUser();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [photoUrl, setPhotoUrl] = useState(user?.profile_photo || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await api.updateProfile({ first_name: firstName, profile_photo: photoUrl || null });
      await api.getMe();
      setEditing(false);
      setMessage({ type: 'success', text: 'Profile updated' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFirstName(user?.first_name || '');
    setPhotoUrl(user?.profile_photo || '');
    setEditing(false);
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3">
          <button
            onClick={() => window.history.back()}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

        {message && (
          <div
            className={`mb-4 p-3 rounded ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Profile Photo */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Photo
            </label>
            {editing ? (
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={firstName}
                    className="w-24 h-24 object-cover"
                  />
                ) : (
                  <span className="text-3xl text-gray-600">
                    {firstName[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* First Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            {editing ? (
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={40}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 text-lg">{firstName}</p>
            )}
          </div>

          {/* Read-only Info */}
          <div className="border-t border-gray-200 pt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Neighborhood</span>
              <span className="text-gray-900 font-medium">{user?.neighborhood?.name || 'Loading...'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Radius</span>
              <span className="text-gray-900 font-medium">{user?.radius_miles} mile{user?.radius_miles !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Notifications</span>
              <span className="text-gray-900 font-medium">
                {user?.notifications_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Actions */}
          {editing ? (
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 bg-gray-200 text-gray-900 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !firstName.trim()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
