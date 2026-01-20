import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
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
  const { user } = useUser();

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
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <button
            onClick={() => navigate('/home')}
            className="text-primary hover:text-primary/80"
          >
            ← Home
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg border bg-destructive/10 border-destructive/20 text-destructive">
            {error}
          </div>
        )}

        {/* Pending Request (Requester) */}
        {data.pending_request_id && (
          <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center">
            <div className="text-4xl mb-4">⏳</div>
            <h2 className="text-xl font-bold text-foreground mb-3">
              Waiting for helper to accept
            </h2>
            <p className="text-muted-foreground mb-8">
              Your request was sent and helper has been notified.
            </p>
            <button
              onClick={handleCancelRequest}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground py-3 px-4 rounded-lg font-medium hover:bg-destructive/90 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? 'Cancelling...' : 'Cancel Request'}
            </button>
          </div>
        )}

        {/* Active Task */}
        {data.task && (
          <div className="bg-card rounded-lg shadow-sm border border-border p-6 space-y-6">
            {/* On The Move Status Banner */}
            {(data.task.status === 'accepted' || data.task.status === 'in_progress') && (
              <div className="p-4 rounded-lg border bg-primary/10 border-primary/20">
                <div className="flex items-center gap-3 text-primary">
                  <span className="text-2xl">🚶</span>
                  {data.task.helper_id === user?.id ? (
                    <span className="font-medium">You are on the move</span>
                  ) : (
                    <span className="font-medium">Your neighbor is on the move</span>
                  )}
                </div>
              </div>
            )}

            <h2 className="text-xl font-bold text-foreground mb-4">
              {data.task.status === 'accepted' && 'Task Accepted'}
              {data.task.status === 'in_progress' && 'Task in Progress'}
              {data.task.status === 'completed' && 'Task Complete'}
            </h2>

            {data.task.description && (
              <div className="p-4 rounded-lg bg-muted">
                <h3 className="text-sm font-medium text-foreground mb-2">Task</h3>
                <p className="text-foreground">{data.task.description}</p>
              </div>
            )}

            {data.task.status === 'accepted' && (
              <button
                onClick={handleStartTask}
                disabled={actionLoading}
                className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? 'Starting...' : 'Start Task'}
              </button>
            )}

            {data.task.status === 'in_progress' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Proof Photo (Optional)
                  </label>
                  <input
                    type="url"
                    value={proofPhotoUrl}
                    onChange={(e) => setProofPhotoUrl(e.target.value)}
                    placeholder="https://example.com/proof.jpg"
                    className="w-full border border-input rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  onClick={handleCompleteTask}
                  disabled={actionLoading}
                  className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? 'Completing...' : 'Mark Complete'}
                </button>
              </>
            )}

            {data.task.status === 'completed' && (
              <div className="text-center py-4">
                <div className="text-4xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  Task Completed!
                </h3>
                <p className="text-muted-foreground mb-6">
                  You earned ${data.task.tip_amount_usd?.toFixed(2) || '0.00'} USD
                </p>
                <button
                  onClick={() => navigate('/wallet')}
                  className="bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  View Wallet
                </button>
              </div>
            )}

            {data.task.completed_at && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Completed at {new Date(data.task.completed_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Incoming Requests (Helper) */}
        {incomingRequests.length > 0 && !data.task && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-foreground mb-6">
              Incoming Requests
            </h2>
            <div className="space-y-4">
              {incomingRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-card rounded-lg shadow-sm border border-border p-6"
                >
                  <p className="text-foreground mb-4">{request.message}</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Suggested tip: ${request.suggested_tip_usd.toFixed(2)}
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={actionLoading}
                      className="flex-1 bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(request.id)}
                      disabled={actionLoading}
                      className="flex-1 bg-secondary text-secondary-foreground py-3 px-4 rounded-lg font-medium hover:bg-secondary/80 disabled:opacity-50 transition-colors"
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
          <div className="text-center py-16">
            <div className="text-4xl mb-4">📭</div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              No active task
            </h2>
            <p className="text-muted-foreground mb-8">
              Create a broadcast or wait for incoming requests.
            </p>
            <button
              onClick={() => navigate('/home')}
              className="bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Go to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
