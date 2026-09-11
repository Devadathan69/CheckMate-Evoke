
import { BrowserRouter as Router, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState, type ReactNode } from 'react';
import { auth, isFirebaseConfigured } from './firebase';
import { getEvent } from './events';
import AdminLogin from './components/AdminLogin';
import Dashboard from './components/Dashboard';
import EventPicker from './components/EventPicker';

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    return onAuthStateChanged(auth!, (user) => {
      setSignedIn(Boolean(user));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="grid min-h-dvh place-items-center bg-[#17012e] text-sm text-[#d8cae6]">Loading organiser access…</div>;
  }

  if (!signedIn) return <Navigate to="/" replace />;

  return children;
};

const EventDashboardRoute = () => {
  const { eventId } = useParams();
  if (!eventId || !getEvent(eventId)) return <Navigate to="/" replace />;

  return (
    <RequireAuth>
      <Dashboard eventId={eventId} />
    </RequireAuth>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<EventPicker />} />
        <Route path="/login/:eventId" element={<AdminLogin />} />
        <Route path="/events/:eventId" element={<EventDashboardRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
