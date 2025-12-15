import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './userContext.jsx';
import { audio } from './utils/audioSystem';
import Tooltip from './components/Tooltip';

export default function Profile() {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const [name, setName] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profilePic, setProfilePic] = useState(user?.profilePic || '');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const emojis = ['😊', '😍', '🤩', '👍', '❤️', '🔥', '✨', '🎉', '🌟', '💯', '🚀', '🎯', '💪', '🙌', '👏', '🌈', '🌍', '✈️', '🗺️', '📍', '🏆', '⭐', '💡', '🎨', '🎮', '🏃', '🌟', '🎪', '🎭', '🎬'];

  useEffect(() => {
    audio.playPageLoad();
  }, []);

  const handleProfilePicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePic(event.target.result);
        audio.playConfirm();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      setError('Login required');
      return;
    }
    try {
      setUpdating(true);
      setError('');
      setStatus('');
      const res = await put('/user/update', values);
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id, 
          username: name,
          email: email,
          bio: bio,
          profilePic: profilePic
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Update failed');
      }
      const data = await res.json().catch(() => ({}));
      setUser({ 
        ...user, 
        username: data.username || name,
        email: data.email || email,
        bio: data.bio || bio,
        profilePic: data.profilePic || profilePic
      });
      setStatus('Profile updated');
      audio.playConfirm();
    } catch (err) {
      setError(err.message || 'Unable to update');
      audio.playError();
    } finally {
      setUpdating(false);
      setTimeout(() => setStatus(''), 1800);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      setError('');
      setStatus('');
      await post('/user/logout').catch(() => {});
    } finally {
      setUser(null);
      setStatus('Logged out');
      setLoggingOut(false);
      navigate('/', { replace: true });
      setTimeout(() => setStatus(''), 1800);
    }
  };

  const handleDelete = async () => {
    if (!user?.id) {
      setError('Login required');
      return;
    }
    try {
      setDeleting(true);
      setError('');
      setStatus('');
      const res = await del('/user/delete', { body: JSON.stringify({ user_id: user.id }) });
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      setUser(null);
      setStatus('Account deleted');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to delete account');
    } finally {
      setDeleting(false);
      setTimeout(() => setStatus(''), 1800);
    }
  };

  return (
    <div className="app-shell">
      <main>
        <section style={{ marginBottom: 14 }}>
          <h1 style={{ margin: '0 0 6px', cursor: 'default' }} onMouseEnter={() => audio.playHover()}>
            👤 Your Profile
          </h1>
          <p style={{ margin: 0, color: 'var(--muted)' }}>✏️ Manage your identity and progress.</p>
        </section>

        <section className="card" style={{ marginBottom: 14 }}>
          <form onSubmit={handleUpdate} style={{ display: 'grid', gap: 16 }}>
            {/* Profile Picture */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div 
                style={{ 
                  width: 100, 
                  height: 100, 
                  borderRadius: '50%', 
                  overflow: 'hidden', 
                  background: 'var(--panel-strong)',
                  border: '3px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                {profilePic ? (
                  <img 
                    src={profilePic} 
                    alt="Profile" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }} 
                  />
                ) : (
                  <span style={{ fontSize: 40, color: 'var(--muted)' }}>👤</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <Tooltip
                  label="Profile Photo"
                  info="Upload a picture to personalize your profile. Helps other travelers recognize you!"
                  icon="📸"
                >
                  <label 
                    onMouseEnter={() => audio.playHover()}
                    style={{ 
                      display: 'inline-block',
                      padding: '10px 16px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--panel)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 14
                    }}
                  >
                    📷 Upload Photo
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleProfilePicUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </Tooltip>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                  JPG, PNG or GIF. Max 5MB.
                </p>
              </div>
            </div>

            {/* Name */}
            <label style={{ display: 'grid', gap: 6 }}>
              <Tooltip
                label="Display Name"
                info="Your public username visible to other users. Can be changed anytime."
                icon="👤"
              >
                <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>Display Name</span>
              </Tooltip>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: '#1f232a',
                  color: 'var(--text)',
                  fontSize: 15
                }}
                required
              />
            </label>

            {/* Email */}
            <label style={{ display: 'grid', gap: 6 }}>
              <Tooltip
                label="Email Address"
                info="Contact email for account recovery and notifications. Only visible to you."
                icon="✉️"
              >
                <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>Email</span>
              </Tooltip>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: '#1f232a',
                  color: 'var(--text)',
                  fontSize: 15
                }}
              />
            </label>

            {/* Bio */}
            <label style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tooltip
                  label="Bio"
                  info="Tell other travelers about yourself! Share your travel style and interests."
                  icon="📝"
                >
                  <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>Bio</span>
                </Tooltip>
                <button
                  type="button"
                  onClick={() => { setShowEmojiPicker(!showEmojiPicker); audio.playClick(); }}
                  onMouseEnter={() => audio.playHover()}
                  style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    fontSize: 14,
                    transition: 'transform 150ms ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  😊 Emoji
                </button>
              </div>
              
              {showEmojiPicker && (
                <div style={{
                  padding: '12px',
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(10, 1fr)',
                  gap: 6,
                  maxHeight: 200,
                  overflowY: 'auto'
                }}>
                  {emojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setBio(bio + emoji);
                        audio.playClick();
                      }}
                      onMouseEnter={() => audio.playHover()}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '8px',
                        cursor: 'pointer',
                        fontSize: 20,
                        transition: 'transform 150ms ease, background 150ms ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.2)';
                        e.currentTarget.style.background = 'rgba(255, 222, 47, 0.1)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself... Add emojis to express yourself! ✨"
                rows={4}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: '#1f232a',
                  color: 'var(--text)',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </label>

            <button
              type="submit"
              onMouseEnter={() => audio.playHover()}
              onClick={() => audio.playClick()}
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--accent)',
                background: 'var(--accent)',
                color: '#0c1317',
                fontWeight: 800,
                fontSize: 15,
                cursor: updating ? 'wait' : 'pointer',
                marginTop: 4,
                opacity: updating ? 0.8 : 1,
              }}
              disabled={updating || !name}
            >
              {updating ? '⏳ Saving...' : '✓ Save Profile'}
            </button>
          </form>
        </section>

        <section className="card" style={{ display: 'grid', gap: 10 }}>
          <button
            onClick={() => { audio.playClick(); handleLogout(); }}
            onMouseEnter={() => audio.playHover()}
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text)',
              fontWeight: 700,
              cursor: loggingOut ? 'wait' : 'pointer',
              opacity: loggingOut ? 0.8 : 1,
            }}
            disabled={loggingOut}
          >
            {loggingOut ? 'Logging out...' : 'Log out'}
          </button>

          <button
            onClick={() => { audio.playClick(); handleDelete(); }}
            onMouseEnter={() => audio.playHover()}
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid #c44d56',
              background: '#c44d56',
              color: '#0c1317',
              fontWeight: 800,
              cursor: deleting ? 'wait' : 'pointer',
              opacity: deleting ? 0.8 : 1,
            }}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete account'}
          </button>

          {error && <div style={{ color: '#ffb3b3' }}>{error}</div>}
          {status && <div style={{ color: 'var(--accent-2)', fontWeight: 600 }}>{status}</div>}
        </section>
      </main>
    </div>
  );
}
