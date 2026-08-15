import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, userProfile, loading, isAdmin } = useAuth();

  if (loading) return <LoadingSpinner message="Checking session..." />;

  if (!user) return <Navigate to="/login" replace />;

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!userProfile) {
    return (
      <div className="auth-error">
        <p>Your account is not set up. Ask an admin to add your profile in Firestore.</p>
      </div>
    );
  }

  return children;
}
