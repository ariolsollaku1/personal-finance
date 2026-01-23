import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { session, initializeUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      // The session should be automatically set by Supabase after OAuth redirect
      // We just need to wait for it and then initialize the user
      if (session) {
        try {
          await initializeUser();
          navigate('/');
        } catch (err) {
          console.error('Error initializing user:', err);
          setError('Failed to initialize user account');
        }
      }
    };

    // Check URL for error
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const errorDescription = hashParams.get('error_description');
    if (errorDescription) {
      setError(errorDescription);
      return;
    }

    // Small delay to ensure session is set
    const timer = setTimeout(handleCallback, 500);
    return () => clearTimeout(timer);
  }, [session, navigate, initializeUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Authentication Error
            </h2>
            <p className="mt-2 text-center text-sm text-red-600">{error}</p>
            <p className="mt-4 text-center">
              <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Back to login
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Completing sign in...
          </h2>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
