import { ReactNode, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AUTH_EVENTS } from '../lib/api';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Handle auth expiration events from API layer
  const handleAuthExpired = useCallback(() => {
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    // Listen for auth expiration events dispatched by the API layer
    window.addEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleAuthExpired);
    };
  }, [handleAuthExpired]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Note: User initialization now happens automatically server-side
  // in the auth middleware on first authenticated API call

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
