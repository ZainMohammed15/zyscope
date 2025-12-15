import React, { useEffect, useState } from 'react';
import { Link, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Logo from './components/Logo.jsx';
import Assistant from './components/Assistant.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import { useUser } from './userContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import Landing from './Landing';
import Login from './Login';
import Dashboard from './Dashboard';
import Compare from './Compare';
import Explore from './Explore';
import City from './City';
import Reviews from './Reviews';
import Leaderboard from './Leaderboard';
import Profile from './Profile';
import Help from './Help';
import MiniGameContainer from './MiniGameContainer.jsx';
import { audio } from './utils/audioSystem';

const LAST_ROUTE_KEY = 'zyscope_last_route';
const SOUND_ENABLED_KEY = 'zyscope_sound_enabled';

export default function App() {
  const { user, setUser } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [restored, setRestored] = useState(false);
  const [routeClass, setRouteClass] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStartTime, setLoadingStartTime] = useState(Date.now());

  // Show loading spinner on initial page load/refresh
  useEffect(() => {
    if (restored) {
      const elapsed = Date.now() - loadingStartTime;
      const delay = Math.max(0, 500 - elapsed);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [restored, loadingStartTime]);

  // Restore the last visited route after a hard refresh.
  useEffect(() => {
    if (restored) return;
    const stored = localStorage.getItem(LAST_ROUTE_KEY);
    if (stored && location.pathname === '/') {
      navigate(stored, { replace: true });
    }
    setRestored(true);
  }, [restored, location.pathname, navigate]);

  // Persist the current route so refresh lands on the same page.
  useEffect(() => {
    localStorage.setItem(LAST_ROUTE_KEY, `${location.pathname}${location.search || ''}`);
  }, [location.pathname, location.search]);

  // Persist sound enabled state across page refreshes
  useEffect(() => {
    localStorage.setItem(SOUND_ENABLED_KEY, soundEnabled);
  }, [soundEnabled]);

  // Show loading spinner on route change (minimum 0.5 second display)
  useEffect(() => {
    if (loadingStartTime === null) return;
    const elapsed = Date.now() - loadingStartTime;
    const delay = Math.max(0, 500 - elapsed);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [location, loadingStartTime]);

  // Smooth route transition: apply a fade-in on route change.
  useEffect(() => {
    setRouteClass('fade-enter');
    const id = requestAnimationFrame(() => setRouteClass('fade-enter-active'));
    return () => cancelAnimationFrame(id);
  }, [location.pathname]);

  // Global button/link click sounds
  useEffect(() => {
    const handleClick = (e) => {
      if (soundEnabled && e.target.matches('button, a, .btn, input[type="submit"]')) {
        audio.click();
      }
      // Show loading spinner on navigation
      if (e.target.matches('a')) {
        setIsLoading(true);
        setLoadingStartTime(Date.now());
      }
    };
    const handleHover = (e) => {
      if (soundEnabled && e.target.matches('button, a, .btn')) {
        audio.hover();
      }
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('mouseover', handleHover);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('mouseover', handleHover);
    };
  }, [soundEnabled]);

  const handleLogout = async () => {
    try {
      await post('/user/logout').catch(() => {});
    } finally {
      setUser(null);
    }
  };

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="navbar-inner">
          <Logo size={180} />
          <nav className="nav-links">
            <Link to="/" onMouseEnter={() => audio.playHover()}>Home</Link>
            {user && <Link to="/dashboard" onMouseEnter={() => audio.playHover()}>Dashboard</Link>}
            <Link to="/compare" onMouseEnter={() => audio.playHover()}>Compare</Link>
            {user && <Link to="/explore" onMouseEnter={() => audio.playHover()}>Explore</Link>}
            {user && <Link to="/reviews" onMouseEnter={() => audio.playHover()}>Reviews</Link>}
            <Link to="/leaderboard" onMouseEnter={() => audio.playHover()}>Leaderboard</Link>
            <Link to="/minigame" onMouseEnter={() => audio.playHover()} title="Surprise XP">🎮 Mini Game</Link>
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent duplicate click sound
                const newState = !soundEnabled;
                setSoundEnabled(newState);
                audio.enabled = newState;
                if (newState) audio.success();
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: 14,
              }}
              title="Toggle sound effects"
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            {user ? (
              <>
                <Link to="/profile" onMouseEnter={() => audio.playHover()}>Profile</Link>
                <button
                  onClick={handleLogout}
                  onMouseEnter={() => audio.playHover()}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" onMouseEnter={() => audio.playHover()}>Login</Link>
            )}
            <Link to="/help" onMouseEnter={() => audio.playHover()}>Help</Link>
          </nav>
        </div>
      </header>

      <main className={routeClass}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
          <Route path="/city/:name" element={<City />} />
          <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/minigame" element={<MiniGameContainer />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/help" element={<Help />} />
        </Routes>
      </main>

      <footer className="footer-sentinel">
        <div>© 2025 ZYSCOPE · Explore smart. Move with intent.</div>
        <div className="signature-hand" aria-label="Signature: Zain">Zain</div>
      </footer>

      <Assistant />
      <LoadingSpinner isVisible={isLoading} />
    </div>
  );
}
