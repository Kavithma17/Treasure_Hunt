import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './Admin.css';

const ADMIN_USER = import.meta.env.VITE_ADMIN_USER || 'admin';
const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS || 'hunter123';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    setTimeout(() => {
      const ok = username === ADMIN_USER && password === ADMIN_PASS;
      setBusy(false);
      if (!ok) {
        setError('Invalid admin credentials');
        return;
      }
      localStorage.setItem('admin_auth', 'ok');
      const dest = location.state?.from || '/admin/main';
      navigate(dest, { replace: true });
    }, 300);
  };

  return (
    <div className="admin-shell">
      <div className="admin-card" style={{ maxWidth: 480 }}>
        <h1 className="admin-title">Admin Login</h1>
        <p className="admin-subtitle">Use the shared admin credentials. This is not stored in the database.</p>

        {error && <div className="admin-error">{error}</div>}

        <form onSubmit={handleSubmit} className="admin-grid" style={{ gridTemplateColumns: '1fr' }}>
          <label className="admin-field">
            <span className="admin-label">Username</span>
            <input
              className="admin-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="admin"
              required
            />
          </label>

          <label className="admin-field">
            <span className="admin-label">Password</span>
            <input
              className="admin-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </label>

          <button className="admin-btn" type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Login'}
          </button>
        </form>

        <div className="admin-inline" style={{ marginTop: 12 }}>
          <Link className="admin-btn secondary" to="/">Back to Home</Link>
          <button
            className="admin-btn secondary"
            type="button"
            onClick={() => {
              localStorage.removeItem('admin_auth');
              setUsername('');
              setPassword('');
              setError('');
            }}
          >
            Clear Login
          </button>
        </div>
      </div>
    </div>
  );
}
