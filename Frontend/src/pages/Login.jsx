import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Signup.css';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export default function LoginPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) {
      setError('Please enter both name and key');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const resp = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), key: key.trim() })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data.error || 'Login failed');
      }
      navigate('/game', { state: { playerName: data.name, playerKey: data.key } });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-background">
        <div className="scanline-signup"></div>
      </div>
      <div className="signup-content">
        <div className="signup-card">
          <div className="card-header">
            <div className="key-icon">🔐</div>
            <h1 className="signup-title">Player Login</h1>
            <p className="signup-subtitle">Use your name and player key to continue</p>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-group">
              <label className="form-label">Player Name</label>
              <input
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Player Key</label>
              <input
                className="form-input"
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="E.g., MIGHTY-MANGO"
              />
            </div>

            <button className="start-button" type="submit" disabled={isLoading}>
              {isLoading ? 'Logging in…' : 'Login'}
            </button>

            <div className="form-footer">
              <p>Need a key? <Link to="/signup" className="link">Register here</Link></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
