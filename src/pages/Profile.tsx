import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { api } from '../lib/api-client';

export default function Profile() {
  const navigate = useNavigate();
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
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-8">Profile</h1>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-destructive/10 border border-destructive/20 text-destructive'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          {/* Profile Photo */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-foreground mb-3">
              Profile Photo
            </label>
            {editing ? (
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full border border-input rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={firstName}
                    className="w-24 h-24 object-cover"
                  />
                ) : (
                  <span className="text-3xl text-muted-foreground">
                    {firstName[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* First Name */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-foreground mb-3">
              First Name
            </label>
            {editing ? (
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={40}
                className="w-full border border-input rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <p className="text-foreground text-lg">{firstName}</p>
            )}
          </div>

          {/* Read-only Info */}
          <div className="border-t border-border pt-8 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Neighborhood</span>
              <span className="text-foreground font-medium">{user?.neighborhood?.name || 'Loading...'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Radius</span>
              <span className="text-foreground font-medium">{user?.radius_miles} mile{user?.radius_miles !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Notifications</span>
              <span className="text-foreground font-medium">
                {user?.notifications_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Actions */}
          {editing ? (
            <div className="mt-8 flex gap-4">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 bg-secondary text-secondary-foreground py-2.5 px-4 rounded-lg font-medium hover:bg-secondary/80 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !firstName.trim()}
                className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="mt-8 w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
