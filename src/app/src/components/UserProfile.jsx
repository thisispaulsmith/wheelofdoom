import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ThemeMenu } from './ThemeMenu';
import './UserProfile.css';

export function UserProfile() {
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="user-profile" onClick={() => setMenuOpen(!menuOpen)}>
        <div className="user-avatar user-avatar-loading"></div>
        <ThemeMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      </div>
    );
  }

  const isAnonymous = !user || user.userDetails === 'anonymous';

  if (isAnonymous) {
    return (
      <div className="user-profile" onClick={() => setMenuOpen(!menuOpen)}>
        <div className="user-avatar user-avatar-anonymous" aria-label="Anonymous user">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <ThemeMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      </div>
    );
  }

  return (
    <div className="user-profile" onClick={() => setMenuOpen(!menuOpen)}>
      <img
        src={`/api/user/photo?t=${Date.now()}`}
        alt={user.userDetails}
        className="user-avatar"
        title={user.userDetails}
        aria-label={`Signed in as ${user.userDetails}`}
        onError={(e) => {
          // Fallback to anonymous avatar if photo fails to load
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
      <div className="user-avatar user-avatar-anonymous" style={{ display: 'none' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
      <ThemeMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
