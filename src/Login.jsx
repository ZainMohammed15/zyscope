import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './userContext.jsx';
import SocialLogin from './components/SocialLogin.jsx';
import { audio } from './utils/audioSystem';

const tabs = [
  { key: 'login', label: 'Log In' },
  { key: 'signup', label: 'Sign Up' },
  { key: 'guest', label: 'Guest' },
];

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [active, setActive] = useState('login');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    audio.playPageLoad();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // Only send username when not guest.
    const payload = active === 'guest' ? {} : { username };

    try {
      setLoading(true);
      const res = await post('/user/login', values);
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = 'Login failed';
        try {
          const data = await res.json();
          message = data?.error || message;
        } catch (_) {
          // ignore parse errors
        }
        audio.playError();
        throw new Error(message);
      }

      const data = await res.json();
      audio.playConfirm();
      setUser({ id: data.id, username: data.username, level: data.level, points: data.points });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <main style={{ maxWidth: 520 }}>
        <h1 style={{ margin: '0 0 20px', fontSize: '28px', textAlign: 'center', cursor: 'default' }} onMouseEnter={() => audio.playHover()}>Enter ZYSCOPE</h1>
        <section className="card" style={{ padding: '20px 20px 18px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { audio.playClick(); setActive(tab.key); }}
                onMouseEnter={() => audio.playHover()}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: active === tab.key ? 'var(--accent)' : 'transparent',
                  color: active === tab.key ? '#0c1317' : 'var(--text)',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
            {active !== 'guest' && (
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>Username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => audio.playHover()}
                  placeholder={active === 'signup' ? 'Choose a username' : 'Enter your username'}
                  style={{
                    padding: '12px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: '#1f232a',
                    color: 'var(--text)',
                  }}
                  required
                />
              </label>
            )}

            <button
              type="submit"
              onMouseEnter={() => audio.playHover()}
              style={{
                marginTop: 8,
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid var(--accent)',
                background: 'var(--accent)',
                color: '#0c1317',
                fontWeight: 800,
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.8 : 1,
              }}
              disabled={loading}
            >
              {active === 'login' && '▶ Log In'}
              {active === 'signup' && '✨ Create Account'}
              {active === 'guest' && '👤 Continue as Guest'}
            </button>

            {error && <div style={{ color: '#ffb3b3', fontSize: 14 }}>{error} — try again</div>}
            {loading && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Logging you in…</div>}
          </form>

          <SocialLogin />
        </section>
      </main>
    </div>
  );
}
