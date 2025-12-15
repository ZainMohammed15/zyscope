import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUser } from './userContext.jsx';
import { audio } from './utils/audioSystem';

function Metric({ label, value }) {
  return (
    <div
      style={{
        background: '#20252d',
        padding: '12px 14px',
        borderRadius: 12,
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ color: 'var(--muted)', fontSize: 13 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 22 }}>{value}</div>
    </div>
  );
}

function Review({ review }) {
  return (
    <article
      className="card"
      style={{ padding: '12px 14px 10px', background: '#2a3039', borderColor: 'var(--border)' }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <strong>{review.user}</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{review.created_at}</span>
      </header>
      <div style={{ color: 'var(--accent-2)', fontWeight: 700, marginBottom: 6 }}>Rating: {review.rating}/5</div>
      <p style={{ margin: 0, color: 'var(--text)' }}>{review.comment}</p>
    </article>
  );
}

export default function City() {
  const { user } = useUser();
  const [params] = useSearchParams();
  const initialCityName = params.get('city') || 'Lisbon';

  const [cityName, setCityName] = useState(initialCityName);
  const [city, setCity] = useState(null);
  const [visited, setVisited] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [loadingCity, setLoadingCity] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [error, setError] = useState('');
  const [reviewError, setReviewError] = useState('');
  const audioRef = React.useRef(null);

  const playPing = React.useCallback((frequency = 620) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioRef.current) audioRef.current = new AudioCtx();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = frequency;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch (err) {
      /* ignore audio errors */
    }
  }, []);

  const metrics = useMemo(() => {
    if (!city) return [];
    return [
      { label: 'Adventure', value: city.adventure },
      { label: 'Study', value: city.study },
      { label: 'Travel', value: city.travel },
    ];
  }, [city]);

  useEffect(() => {
    audio.playPageLoad();
  }, []);

  // Load city data and visited state.
  useEffect(() => {
    const loadCity = async () => {
      setLoadingCity(true);
      setError('');
      try {
        const res = await get('/cities');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load country');
        }
        const data = await res.json();
        const found = data.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
        if (!found) throw new Error('Country not found');
        setCity(found);

        // Fetch visits to determine visited status if user exists.
        if (user?.id) {
          const visitsRes = await get(`/visits?user_id=${user.id}`);
          if (visitsRes.ok) {
            const visitsData = await visitsRes.json();
            const hasVisited = (visitsData.visits || []).some((v) => v.location.toLowerCase() === found.name.toLowerCase());
            setVisited(hasVisited);
          }
        }
      } catch (err) {
        setError(err.message || 'Unable to load country');
      } finally {
        setLoadingCity(false);
      }
    };
    loadCity();
  }, [cityName, user?.id]);

  // Load reviews for the city.
  useEffect(() => {
    if (!city) return;
    const loadReviews = async () => {
      setLoadingReviews(true);
      setReviewError('');
      try {
        const res = await get(`/reviews?location=${encodeURIComponent(city.name)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load reviews');
        }
        const data = await res.json();
        setReviews(data.reviews || []);
      } catch (err) {
        setReviewError(err.message || 'Unable to load reviews');
      } finally {
        setLoadingReviews(false);
      }
    };
    loadReviews();
  }, [city]);

  const handleVisit = useCallback(async () => {
    if (!city || !user?.id) return;
    try {
      setError('');
      const res = await post('/explore', { user_id: user.id, location: city.name });
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, location: city.name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update visit');
      }
      setVisited((v) => !v);
      playPing(520);
    } catch (err) {
      setError(err.message || 'Unable to update visit');
    }
  }, [city, user?.id, playPing]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!city || !user?.id) return;
    if (!form.comment) return;
    try {
      setSubmittingReview(true);
      setReviewError('');
      const res = await post('/reviews', { user_id: user.id, location: city.name, rating: Number(form.rating), comment: form.comment });
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, location: city.name, rating: Number(form.rating), comment: form.comment }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit review');
      }
      const data = await res.json();
      if (data.review) {
        setReviews((prev) => [data.review, ...prev]);
      }
      setForm({ rating: 5, comment: '' });
      playPing(780);
      audio.success();
    } catch (err) {
      audio.error();
      setReviewError(err.message || 'Unable to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="app-shell">
      <main>
        <section style={{ marginBottom: 14 }}>
          
          <h1 style={{ margin: '0 0 6px' }}>{city?.name || 'Loading...'}</h1>
          <p style={{ margin: 0, color: 'var(--muted)' }}>{city?.country || ''}</p>
        </section>

        {loadingCity && <div style={{ color: 'var(--muted)', marginBottom: 10 }}>Loading country...</div>}
        {error && <div style={{ color: '#ffb3b3', marginBottom: 10 }}>{error}</div>}

        <section className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>Status</div>
              <div style={{ fontWeight: 700 }}>{visited ? 'Visited' : 'Not visited'}</div>
            </div>
            <button
              onClick={() => { audio.playClick(); handleVisit(); }}
              onMouseEnter={() => audio.playHover()}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--accent)',
                background: visited ? 'transparent' : 'var(--accent)',
                color: visited ? 'var(--text)' : '#0c1317',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              {visited ? 'Unmark visited' : 'Mark visited'}
            </button>
          </div>

          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {metrics.map((m) => (
              <Metric key={m.label} label={m.label} value={m.value} />
            ))}
          </div>
        </section>

        <section className="card" style={{ marginBottom: 14 }}>
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>Rating</span>
              <input
                type="number"
                min="1"
                max="5"
                value={form.rating}
                onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: '#1f232a',
                  color: 'var(--text)',
                }}
                required
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>Comment</span>
              <textarea
                value={form.comment}
                onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                placeholder="What stood out?"
                rows={3}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: '#1f232a',
                  color: 'var(--text)',
                  resize: 'vertical',
                }}
                required
              />
            </label>

            <button
              type="submit"
              onMouseEnter={() => audio.playHover()}
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--accent)',
                background: 'var(--accent)',
                color: '#0c1317',
                fontWeight: 800,
                cursor: submittingReview ? 'wait' : 'pointer',
                marginTop: 4,
                opacity: submittingReview ? 0.8 : 1,
              }}
              disabled={submittingReview || !user?.id}
            >
              {submittingReview ? 'Submitting...' : 'Submit review'}
            </button>
            {reviewError && <div style={{ color: '#ffb3b3' }}>{reviewError}</div>}
          </form>
        </section>

        <section className="card">
          
          {loadingReviews && <div style={{ color: 'var(--muted)' }}>Loading reviews...</div>}
          {reviewError && !loadingReviews && <div style={{ color: '#ffb3b3' }}>{reviewError}</div>}
          <div style={{ display: 'grid', gap: 10 }}>
            {reviews.length === 0 && <div style={{ color: 'var(--muted)' }}>No reviews yet.</div>}
            {reviews.map((review) => (
              <Review key={review.id} review={review} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
