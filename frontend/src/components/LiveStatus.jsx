import { useCallback, useEffect, useState } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function LiveStatus() {
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('Checking live status...');

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      const payload = await response.json().catch(() => ({}));

      if (response.ok && payload.firebaseConfigured) {
        setStatus('online');
        setMessage('Website and backend are active');
        return;
      }

      setStatus('warning');
      setMessage(payload.message || 'Backend is running, but Firebase is not ready');
    } catch {
      setStatus('offline');
      setMessage('Backend is offline or not reachable');
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = window.setInterval(checkStatus, 10000);
    return () => window.clearInterval(interval);
  }, [checkStatus]);

  const label =
    status === 'online'
      ? 'Live Active'
      : status === 'warning'
        ? 'Backend Warning'
        : status === 'offline'
          ? 'Offline'
          : 'Checking...';

  return (
    <button
      type="button"
      className={`live-status live-status-${status}`}
      onClick={checkStatus}
      title={message}
    >
      <span className="live-dot" />
      {label}
    </button>
  );
}
