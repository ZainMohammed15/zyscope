import React, { useEffect, useState } from 'react';
import { audio } from './utils/audioSystem';

const baseShortcuts = [
  { keys: 'Arrow keys', desc: 'Navigate map markers (Explore) and switch focus items.' },
  { keys: 'Enter', desc: 'Toggle visited on the active marker (Explore).' },
  { keys: 'Tab / Shift+Tab', desc: 'Move between interactive controls and inputs.' },
];

const basePlatformNotes = [
  {
    title: 'Desktop',
    body: 'Use keyboard navigation for speed. Most interactions support Enter/Space activation.',
  },
  {
    title: 'Mobile',
    body: 'Tap markers and cards; sticky nav keeps primary actions reachable.',
  },
  {
    title: 'Accessibility',
    body: 'High-contrast theme, focusable controls, and semantic headings throughout.',
  },
];

export default function Help() {
  const [liveShortcuts, setLiveShortcuts] = useState([]);
  const [livePlatformNotes, setLivePlatformNotes] = useState([]);
  const [liveStatus, setLiveStatus] = useState('');
  const [loadingLive, setLoadingLive] = useState(false);

  useEffect(() => {
    audio.playPageLoad();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadHelp = async () => {
      try {
        setLoadingLive(true);
        setLiveStatus('Syncing help…');
        const res = await get('/help');
        if (!res.ok) throw new Error('Request failed');
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.shortcuts)) setLiveShortcuts(data.shortcuts);
        if (Array.isArray(data.platformNotes)) setLivePlatformNotes(data.platformNotes);
        if (data.message) setLiveStatus(data.message);
        else setLiveStatus('Live help loaded');
      } catch (_err) {
        if (!cancelled) setLiveStatus('Using built-in tips');
      } finally {
        if (!cancelled) setLoadingLive(false);
      }
    };

    loadHelp();
    return () => {
      cancelled = true;
    };
  }, []);

  const shortcutItems = [...baseShortcuts, ...liveShortcuts];
  const platformItems = [...basePlatformNotes, ...livePlatformNotes];

  return (
    <div className="app-shell">
      <main>
        <section style={{ marginBottom: 14 }}>
          <h1 style={{ margin: '0 0 6px', cursor: 'default' }} onMouseEnter={() => audio.playHover()}>
            ❓ Help & Tips
          </h1>
          <p style={{ margin: 0, color: 'var(--muted)' }}>⌨️ Keyboard shortcuts and platform tips.</p>
          {liveStatus && (
            <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 13 }}>
              {loadingLive ? 'Loading… ' : ''}
              {liveStatus}
            </p>
          )}
        </section>

        <section className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            {shortcutItems.map((item) => (
              <div
                key={item.keys}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: '#20252d',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <strong>{item.keys}</strong>
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>{item.desc}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {platformItems.map((note) => (
              <article
                key={note.title}
                className="card"
                style={{ padding: '14px 14px 12px', background: '#2a3039', borderColor: 'var(--border)' }}
              >
                <h3 style={{ margin: '0 0 6px' }}>{note.title}</h3>
                <p style={{ margin: 0, color: 'var(--muted)' }}>{note.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
