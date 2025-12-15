import React, { useEffect, useState, useCallback, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useUser } from './userContext.jsx';
import { audio } from './utils/audioSystem';
import { post, get } from './utils/api';
import FetchError from './components/FetchError';
import Tooltip from './components/Tooltip';

export default function Explore() {
  const { user } = useUser();
  const [cities, setCities] = useState([]);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [visited, setVisited] = useState(() => new Set());
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const mapContainerRef = useRef(null);
  const audioRef = useRef(null);

  const playPing = useCallback((frequency = 720) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioRef.current) audioRef.current = new AudioCtx();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = frequency;
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.24);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (err) {
      /* ignore audio errors */
    }
  }, []);

  const filteredCities = cities.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.country.toLowerCase().includes(search.toLowerCase()));
  const activeCity = filteredCities[activeIndex];

  const xp = React.useMemo(() => {
    const size = visited.size;
    const points = size * 25;
    const level = Math.max(1, Math.floor(points / 250) + 1);
    const prevCap = (level - 1) * 250;
    const nextCap = level * 250;
    const pct = Math.min(100, Math.round(((points - prevCap) / (nextCap - prevCap || 1)) * 100));
    return { size, points, level, pct, nextCap };
  }, [visited.size]);

  const milestones = React.useMemo(() => [5, 10, 25, 50, 100], []);

  useEffect(() => {
    audio.playPageLoad();
    const loadCities = async () => {
      try {
        const data = await get('/cities');
        setCities(data || []);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to load countries');
      }
    };
    loadCities();
  }, []);

  const toggleVisitedLocal = useCallback((cityName) => {
    setVisited((prev) => {
      const next = new Set(prev);
      if (next.has(cityName)) next.delete(cityName);
      else next.add(cityName);
      return next;
    });
  }, []);

  // Simple achievement thresholds based on number of visits
  useEffect(() => {
    if (visited.size === 0) return;
    const milestones = [5, 10, 25, 50, 100];
    if (milestones.includes(visited.size)) {
      setToast(`Achievement unlocked: ${visited.size} countries visited!`);
      playPing(880);
      audio.achievement();
      setTimeout(() => setToast(''), 2500);
    }
  }, [visited.size, playPing]);

  const handleKey = useCallback(
    (event) => {
      const { key } = event;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
        event.preventDefault();
      }
      if (key === 'ArrowRight') setActiveIndex((i) => Math.min(i + 1, filteredCities.length - 1));
      if (key === 'ArrowLeft') setActiveIndex((i) => Math.max(i - 1, 0));
      if (key === 'ArrowDown') setActiveIndex((i) => Math.min(i + 2, filteredCities.length - 1));
      if (key === 'ArrowUp') setActiveIndex((i) => Math.max(i - 2, 0));
      if (key === 'Enter' && activeCity) handleVisit(activeCity.name);
    },
    [filteredCities.length, activeCity]
  );

  useEffect(() => {
    const handler = (e) => handleKey(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  // Initialize Leaflet map once.
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;
    const map = L.map(mapContainerRef.current, {
      worldCopyJump: true,
      zoomControl: false,
    }).setView([20, 0], 2.2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;
  }, []);

  // Refresh markers when cities/visited/active change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers.
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    filteredCities.forEach((city, idx) => {
      const isActive = idx === activeIndex;
      const isVisited = visited.has(city.name);
      const marker = L.circleMarker([city.lat, city.lon], {
        radius: isActive ? 10 : 7,
        color: isActive ? '#ffde2f' : '#7fd8be',
        weight: isActive ? 3 : 2,
        fillColor: isVisited ? '#3fbf8c' : '#f7c948',
        fillOpacity: 0.9,
        className: isVisited ? 'marker-glow' : 'marker-pulse',
      });

      marker.on('click', () => {
        setActiveIndex(idx);
        handleVisit(city.name);
        map.flyTo([city.lat, city.lon], 5, { duration: 0.7 });
      });

      marker.bindTooltip(
        `${city.name} — ${city.country}<br/>Adventure ${city.adventure} | Study ${city.study} | Travel ${city.travel}`,
        { permanent: false, direction: 'top' }
      );
      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [filteredCities, activeIndex, visited]);

  // Spin-the-globe to a random city.
  const handleSpin = () => {
    const nextIndex = Math.floor(Math.random() * cities.length);
    setActiveIndex(nextIndex);
    const city = cities[nextIndex];
    if (mapRef.current && city) {
      mapRef.current.flyTo([city.lat, city.lon], 5, { duration: 1.1 });
    }
  };

  // When active city changes, gently move the map.
  useEffect(() => {
    const city = cities[activeIndex];
    if (mapRef.current && city) {
      mapRef.current.flyTo([city.lat, city.lon], 4.5, { duration: 0.6 });
    }
  }, [activeIndex, cities]);

  // Reset selection when search changes to keep index in range.
  useEffect(() => {
    if (filteredCities.length === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((idx) => Math.min(idx, filteredCities.length - 1));
  }, [filteredCities.length]);

  // Fetch cities and user visits from backend.
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        // Load cities
        const citiesRes = await get('/cities');
        if (!citiesRes.ok) {
          const data = await citiesRes.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load countries');
        }
        const rawCities = await citiesRes.json();
        const citiesData = (rawCities || []).map((c) => ({
          name: c.name,
          country: c.country,
          lat: c.lat ?? c.latitude,
          lon: c.lon ?? c.longitude,
          adventure: c.adventure,
          study: c.study,
          travel: c.travel,
        }));
        setCities(citiesData);

        // Load user visits if logged in
        if (user?.id) {
          try {
            const visitsRes = await get(`/visits?user_id=${user.id}`);
            if (visitsRes.ok) {
              const visitsData = await visitsRes.json();
              const visitedRows = visitsData.visits || visitsData || [];
              const visitedSet = new Set(visitedRows.map(v => v.location));
              setVisited(visitedSet);

              // Center map on last visited city
              if (visitedRows.length > 0 && citiesData.length > 0) {
                const lastVisit = visitedRows[visitedRows.length - 1];
                const lastCity = citiesData.find(c => c.name === lastVisit.location);
                if (lastCity && mapRef.current) {
                  mapRef.current.setView([lastCity.lat, lastCity.lon], 4.5);
                  const cityIndex = citiesData.findIndex(c => c.name === lastCity.name);
                  if (cityIndex >= 0) setActiveIndex(cityIndex);
                }
              } else {
                setActiveIndex(0);
              }
            }
          } catch (visitsErr) {
            console.error('Failed to load visits:', visitsErr);
            setActiveIndex(0);
          }
        } else {
          setActiveIndex(0);
        }
      } catch (err) {
        setError(err.message || 'Unable to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user?.id]);

  // Mark visited via backend and update local state.
  const handleVisit = useCallback(
    async (cityName) => {
      if (!user?.id || !cityName) return;
      try {
        setError('');
        await post('/explore', { user_id: user.id, location: cityName });
        toggleVisitedLocal(cityName);
        playPing(520);
        setToast(`Marked ${cityName} as visited`);
        setTimeout(() => setToast(''), 1800);
        // Broadcast a lightweight event for other views to update (leaderboard/reviews/dashboard)
        try {
          const ev = new CustomEvent('zyscope:visited', { detail: { city: cityName, userId: user.id, at: Date.now() } });
          window.dispatchEvent(ev);
        } catch (_) {}
      } catch (err) {
        setError(err.message || 'Unable to mark visited');
      }
    },
    [toggleVisitedLocal, user?.id, playPing]
  );

  // Get visited cities with full details
  const visitedCities = cities.filter(city => visited.has(city.name));
  const activeRadarStyle = activeCity
    ? {
        background: `conic-gradient(#ffde2f 0deg ${activeCity.adventure * 3.6}deg, rgba(255,222,47,0.06) ${activeCity.adventure * 3.6}deg 360deg),
          conic-gradient(#7fd8be 0deg ${activeCity.study * 3.6}deg, rgba(127,216,190,0.08) ${activeCity.study * 3.6}deg 360deg),
          conic-gradient(#5ef0ff 0deg ${activeCity.travel * 3.6}deg, rgba(94,240,255,0.06) ${activeCity.travel * 3.6}deg 360deg)`
      }
    : {};

  return (
    <div className="app-shell">
      <main>
        {toast && (
          <div className="card" style={{ position: 'sticky', top: 8, zIndex: 2, marginBottom: 8, background: '#1f2a33', borderColor: '#3fbf8c', color: '#d4ffe8' }}>
            {toast}
          </div>
        )}
        <section className="card" style={{ marginBottom: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
          Pro tip: search filters both the list and map. Arrow keys stay on the filtered list, and Enter marks a country as visited.
        </section>

        <section style={{ marginBottom: 16 }}>
          <h1 style={{ margin: '0 0 10px', cursor: 'default' }} onMouseEnter={() => audio.playHover()}>
            🗺️ Explore the World
          </h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            🎮 Navigate with keyboard arrows or click markers. Hit Enter or click to mark visited.
          </p>
        </section>

        {loading && <div style={{ color: 'var(--muted)', marginBottom: 8 }}>Loading map...</div>}
        {error && <FetchError message={error} onRetry={() => window.location.reload()} />}

        <section className="card" style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 14 }}>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>XP Progress</div>
            <div style={{ fontWeight: 800, fontSize: 22 }}>
              <Tooltip
                label="Level"
                info="Your current level. Every 250 XP earns a new level. Higher levels unlock rewards!"
                icon="📊"
              >
                <span>Level {xp.level}</span>
              </Tooltip>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 8 }}>Next at {xp.nextCap} XP</div>
            <div className="progress-rail">
              <div className="progress-fill" style={{ width: `${xp.pct}%` }} />
            </div>
            <div style={{ color: 'var(--accent-2)', fontSize: 12, marginTop: 6 }}>
              <Tooltip
                label="Experience"
                info="XP earned from visiting countries. Each visit grants 25 XP."
                icon="⭐"
              >
                <span>{xp.points} XP · {xp.size} visits</span>
              </Tooltip>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {milestones.map(m => {
                const unlocked = visited.size >= m;
                return (
                  <Tooltip
                    key={m}
                    label={`Milestone: ${m} Countries`}
                    info={`Unlock an achievement when you visit ${m} countries!`}
                    icon="🏅"
                  >
                    <span className="glow-chip" style={{
                      background: unlocked ? 'rgba(255, 222, 47, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                      borderColor: unlocked ? 'rgba(255, 222, 47, 0.6)' : 'rgba(255, 255, 255, 0.08)',
                      color: unlocked ? '#ffde2f' : 'var(--muted)',
                      padding: '6px 10px',
                      borderRadius: 8,
                      fontSize: 12,
                      border: '1px solid'
                    }}>🏅 {m}</span>
                  </Tooltip>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>
              <Tooltip
                label="Attributes"
                info="Adventure (exploring), Study (culture & history), Travel (logistics & ease). Active country shows its strengths!"
                icon="🎯"
              >
                <span>Adventure / Study / Travel</span>
              </Tooltip>
            </div>
            <div className="radar-shell" style={activeRadarStyle}>
              <div className="radar-sweep" />
              <div className="radar-overlay" />
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 16 }}>
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
              
              <button
                onClick={() => { audio.playClick(); handleSpin(); }}
                onMouseEnter={() => audio.playHover()}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--accent)',
                  background: 'var(--accent)',
                  color: '#0c1317',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Spin the globe
              </button>
            </div>
            <div
              ref={mapContainerRef}
              style={{
                height: 360,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            />
          </section>

          <section className="card" style={{ maxHeight: 420, overflowY: 'auto' }}>
            
            {visitedCities.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No countries visited yet. Click markers to start exploring!
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {visitedCities.map(city => (
                  <div
                    key={city.name}
                    onClick={() => {
                      const idx = cities.findIndex(c => c.name === city.name);
                      if (idx >= 0) setActiveIndex(idx);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: '#20252d',
                      cursor: 'pointer',
                      transition: 'background 180ms ease',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{city.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>{city.country}</div>
                    <div style={{ color: 'var(--accent)', fontSize: 11, marginTop: 4 }}>
                      🎒 Adv {city.adventure} • 📘 Stu {city.study} • ✈️ Trav {city.travel}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                Active: {activeCity?.name} • Visited: {visited.size}
              </div>
            </div>
            {activeCity && (
              <button
                onClick={() => { audio.playClick(); handleVisit(activeCity.name); }}
                onMouseEnter={() => audio.playHover()}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--accent)',
                  background: 'var(--accent)',
                  color: '#0c1317',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {visited.has(activeCity.name) ? 'Unmark visited' : 'Mark visited'}
              </button>
            )}
          </div>

          <div style={{ marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Search countries"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: '#1f232a',
                color: 'var(--text)',
              }}
            />
            {search && filteredCities.length > 0 && (
              <div style={{ background: '#1c2027', border: '1px solid var(--border)', borderRadius: 10, marginTop: 6, maxHeight: 180, overflowY: 'auto' }}>
                {filteredCities.slice(0, 8).map((city, idx) => (
                  <div
                    key={city.name}
                    onClick={() => setActiveIndex(idx)}
                    style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                  >
                    {city.name} — {city.country}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {filteredCities.map((city, idx) => {
              const isActive = idx === activeIndex;
              const isVisited = visited.has(city.name);
              return (
                <div
                  key={city.name}
                  onClick={() => setActiveIndex(idx)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: isActive ? '#262c35' : '#20252d',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background 180ms ease',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{city.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>{city.country}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {isVisited && (
                      <span className="badge" style={{ background: '#1f753d', borderColor: '#1f753d', color: '#d4ffe8' }}>
                        Visited
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        audio.playClick();
                        handleVisit(city.name);
                      }}
                      onMouseEnter={() => audio.playHover()}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text)',
                        cursor: 'pointer',
                      }}
                    >
                      {isVisited ? 'Unmark' : 'Mark'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
