import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useEffect, useState } from 'react';
import { getApiToken, isServerAvailable } from '../lib/api';

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const { ready, setCurrentEmployee } = useApp();
  const location = useLocation();
  const [serverUp, setServerUp] = useState<boolean | null>(null);

  useEffect(() => {
    isServerAvailable().then(setServerUp);
  }, []);

  useEffect(() => {
    if (session) {
      setCurrentEmployee(session.displayName);
    }
  }, [session, setCurrentEmployee]);

  if (loading || !ready || serverUp === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
          <p className="mt-4 text-slate-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (serverUp && !getApiToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname, needServerLogin: true }} />;
  }

  return <Outlet />;
}
