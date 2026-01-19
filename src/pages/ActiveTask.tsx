import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Task, type TaskRequest } from '../lib/api-client';

type ActiveTaskData = {
  task: Task | null;
  pending_request_id: string | null;
};

export default function ActiveTask() {
  const navigate = useNavigate();
  const [data, setData] = useState<ActiveTaskData>({ task: null, pending_request_id: null });
  const [incomingRequests, setIncomingRequests] = useState<TaskRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofPhotoUrl, setProofPhotoUrl] = useState('');

  const loadActiveTask = async () => {
    try {
      const active = await api.getActiveTask();
      setData(active);
    } catch (err) {
      console.error('Failed to load active task:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadIncomingRequests = async () => {
    try {
      const { requests } = await api.getIncomingRequests();
      setIncomingRequests(requests);
    } catch (err) {
      console.error('Failed to load incoming requests:', err);
    }
  };

  useEffect(() => {
    loadActiveTask();
    loadIncomingRequests();
  }, []);

  const handleAcceptRequest = async (requestId: string) => {
    setActionLoading(true);
    setError(null);

    try {
      await api.acceptRequest(requestId);
      await loadActiveTask();
      await loadIncomingRequests();
    } catch (err: any) {
      setError(err?.message || 'Failed to accept request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    setActionLoading(true);
    setError(null);

    try {
      await api.declineRequest(requestId);
      await loadIncomingRequests();
    } catch (err: any) {
      setError(err?.message || 'Failed to decline request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartTask = async () => {
    if (!data.task) return;

    setActionLoading(true);
    setError(null);

    try {
      await api.startTask(data.task.id);
      await loadActiveTask();
    } catch (err: any) {
      setError(err?.message || 'Failed to start task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!data.task) return;

    setActionLoading(true);
    setError(null);

    try {
      await api.completeTask(data.task.id, { proof_photo_url: proofPhotoUrl || null });
      await api.getWallet();
      navigate('/wallet');
    } catch (err: any) {
      setError(err?.message || 'Failed to complete task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!data.pending_request_id) return;

    setActionLoading(true);
    setError(null);

    try {
      await api.cancelRequest(data.pending_request_id);
      navigate('/home');
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel request');
    } finally {
      setActionLoading(false);
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
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3">
          <button
            onClick={() => navigate('/home')}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Home
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {/* Pending Request (Requester) */}
        {data.pending_request_id && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Waiting for helper to accept
            </h2>
            <p className="text-gray-600 mb-6">
              Your request was sent and the helper has been notified.
            </p>
            <button
              onClick={handleCancelRequest}
              disabled={actionLoading}
              className="bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading ? 'Cancelling...' : 'Cancel Request'}
            </button>
          </div>
        )}

        {/* Active Task */}
        {data.task && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {data.task.status === 'accepted' && 'Task Accepted'}
              {data.task.status === 'in_progress' && 'Task in Progress'}
              {data.task.status === 'completed' && 'Task Complete'}
            </h2>

            {data.task.description && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Task</h3>
                <p className="text-gray-900">{data.task.description}</p>
              </div>
            )}

            {data.task.status === 'accepted' && (
              <button
                onClick={handleStartTask}
                disabled={actionLoading}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? 'Starting...' : 'Start Task'}
              </button>
            )}

            {data.task.status === 'in_progress' && (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proof Photo (Optional)
                  </label>
                  <input
                    type="url"
                    value={proofPhotoUrl}
                    onChange={(e) => setProofPhotoUrl(e.target.value)}
                    placeholder="https://example.com/proof.jpg"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleCompleteTask}
                  disabled={actionLoading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Completing...' : 'Mark Complete'}
                </button>
              </>
            )}

            {data.task.status === 'completed' && (
              <div className="text-center">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Task Completed!
                </h3>
                <p className="text-gray-600 mb-4">
                  You earned ${data.task.tip_amount_usd?.toFixed(2) || '0.00'} USD
                </p>
                <button
                  onClick={() => navigate('/wallet')}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700"
                >
                  View Wallet
                </button>
              </div>
            )}

            {data.task.completed_at && (
              <p className="text-sm text-gray-500 mt-4 text-center">
                Completed at {new Date(data.task.completed_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Incoming Requests (Helper) */}
        {incomingRequests.length > 0 && !data.task && (
          <div className="mt-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Incoming Requests
            </h2>
            <div className="space-y-3">
              {incomingRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                >
                  <p className="text-gray-900 mb-4">{request.message}</p>
                  <p className="text-sm text-gray-600 mb-4">
                    Suggested tip: ${request.suggested_tip_usd.toFixed(2)}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(request.id)}
                      disabled={actionLoading}
                      className="flex-1 bg-gray-200 text-gray-900 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!data.task && !data.pending_request_id && incomingRequests.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">📭</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No active task
            </h2>
            <p className="text-gray-600 mb-6">
              Request help or wait for incoming requests.
            </p>
            <button
              onClick={() => navigate('/home')}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700"
            >
              Go to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
