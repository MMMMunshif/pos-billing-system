import { auth } from '../firebase/config';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export async function apiRequest(path, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('You are not signed in');
  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const responseText = await response.text();
  let payload;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }
  return payload?.data ?? payload;
}

export function createPollingSubscription(loader, callback, intervalMs = 5000) {
  let active = true;
  let loading = false;

  const refresh = async () => {
    if (!active || loading) return;
    loading = true;
    try {
      const data = await loader();
      if (active) callback(data);
    } catch (error) {
      console.error('Live refresh failed:', error);
    } finally {
      loading = false;
    }
  };

  refresh();
  const intervalId = window.setInterval(refresh, intervalMs);
  const onFocus = () => refresh();
  window.addEventListener('focus', onFocus);

  return () => {
    active = false;
    window.clearInterval(intervalId);
    window.removeEventListener('focus', onFocus);
  };
}
