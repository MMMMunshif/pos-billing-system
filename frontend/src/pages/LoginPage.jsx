import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { useToast } from '../context/toastContext';
import { ROLES } from '../utils/constants';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(ROLES.STAFF);
  const [loading, setLoading] = useState(false);
  const { login, user, userProfile, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isSubmitting = useRef(false);

  // Already logged in (page refresh) — skip while a login attempt is in progress
  useEffect(() => {
    if (isSubmitting.current || authLoading) return;
    if (user && userProfile) navigate('/dashboard', { replace: true });
  }, [user, userProfile, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    isSubmitting.current = true;
    try {
      const { profile } = await login(email, password, role);
      showToast(`Welcome, ${profile.name || profile.email}!`);
      navigate('/dashboard');
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      isSubmitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-logo">🏪</span>
          <h1>Fancy Shop Manager</h1>
          <p>Sign in to manage your retail shop</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="role-tabs">
            <button
              type="button"
              className={`role-tab ${role === ROLES.ADMIN ? 'active' : ''}`}
              onClick={() => setRole(ROLES.ADMIN)}
            >
              Admin Login
            </button>
            <button
              type="button"
              className={`role-tab ${role === ROLES.STAFF ? 'active' : ''}`}
              onClick={() => setRole(ROLES.STAFF)}
            >
              Staff Login
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@shop.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : `Sign in as ${role}`}
          </button>
        </form>
      </div>
    </div>
  );
}
