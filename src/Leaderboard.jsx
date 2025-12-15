import React, { useEffect, useState } from 'react';
import { audio } from './utils/audioSystem';

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    audio.playPageLoad();
  }, []);

  const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await get('/leaderboard');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load leaderboard');
        }
        const data = await res.json();
        const mapped = (data.users || []).map((u) => ({
          user: u.username,
          points: u.points,
          level: u.level,
          visits: u.visits ?? '—',
          rating: u.avgRating ?? '—',
        }));
        setRows(mapped);
      } catch (err) {
        setError(err.message || 'Unable to fetch leaderboard');
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener('zyscope:visited', handler);
    return () => window.removeEventListener('zyscope:visited', handler);
  }, []);

  return (
    <div className="app-shell">
      <main>
        <section style={{ marginBottom: 14 }}>
          <h1 style={{ margin: '0 0 6px', cursor: 'default' }} onMouseEnter={() => audio.playHover()}>
            🏆 Top Travelers
          </h1>
          <p style={{ margin: 0, color: 'var(--muted)' }}>📊 Ranked by level and points. Visits and ratings shown where available.</p>
        </section>

        <section className="card">
          {loading && <div style={{ color: 'var(--muted)', marginBottom: 8 }}>Loading leaderboard...</div>}
          {error && <div style={{ color: '#ffb3b3', marginBottom: 8 }}>{error}</div>}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted)', fontSize: 13 }}>
                  <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>User</th>
                  <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Level</th>
                  <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Visits</th>
                  <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Points</th>
                  <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Avg Rating</th>
                </tr>
              </thead>
              <tbody>
                {(rows.length ? rows : [{ user: '—', level: '—', visits: '—', points: '—', rating: '—' }]).map((row) => (
                  <tr key={`${row.user}-${row.level}-${row.points}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 600 }}>{row.user}</td>
                    <td style={{ padding: '10px 8px' }}>{row.level}</td>
                    <td style={{ padding: '10px 8px' }}>{row.visits}</td>
                    <td style={{ padding: '10px 8px' }}>{row.points}</td>
                    <td style={{ padding: '10px 8px', color: 'var(--accent-2)', fontWeight: 700 }}>{row.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
