import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Admin.css';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const defaultToken = import.meta.env.VITE_ADMIN_TOKEN || '';

export default function AdminMain() {
  const [form, setForm] = useState({
    code: '',
    title: '',
    description: '',
    clue: '',
    compulsory: false,
    tags: ''
  });
  const [token, setToken] = useState(defaultToken);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState([]);
  const [deleting, setDeleting] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const resp = await fetch(`${baseUrl}/api/admin/main`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
        })
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save');
      }
      const data = await resp.json();
      setMessage(`Saved main question ${data.code}`);
      loadList();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      code: item.code || '',
      title: item.title || '',
      description: item.description || '',
      clue: item.clue || '',
      compulsory: Boolean(item.compulsory),
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (code) => {
    if (!code) return;
    const yes = window.confirm(`Delete main question ${code}?`);
    if (!yes) return;
    try {
      setDeleting(code);
      setError('');
      const resp = await fetch(`${baseUrl}/api/admin/main/${code}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token }
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || 'Delete failed');
      }
      setMessage(`Deleted ${code}`);
      loadList();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting('');
    }
  };

  const loadList = async () => {
    try {
      const resp = await fetch(`${baseUrl}/api/admin/main`, {
        headers: { 'x-admin-token': token }
      });
      if (!resp.ok) throw new Error('Failed to load mains');
      const data = await resp.json();
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="admin-shell">
      <div className="admin-card">
        <h1 className="admin-title">Admin · Main Questions</h1>
        <p className="admin-subtitle">Create or update main questions. Code is unique.</p>

        <div className="admin-inline admin-pill">
          <span className="admin-label">API Base</span>
          <code>{baseUrl}</code>
          <span className="admin-label">Admin Token</span>
          <input
            className="admin-input"
            style={{ width: '180px' }}
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="x-admin-token"
          />
          <Link to="/admin/sub" className="admin-btn secondary">Go to Sub Questions</Link>
        </div>

        {message && <div className="admin-success">{message}</div>}
        {error && <div className="admin-error">{error}</div>}

        <form onSubmit={submit} className="admin-grid" style={{ marginTop: 16 }}>
          <label className="admin-field">
            <span className="admin-label">Code *</span>
            <input
              className="admin-input"
              name="code"
              value={form.code}
              onChange={handleChange}
              required
            />
          </label>

          <label className="admin-field">
            <span className="admin-label">Title *</span>
            <input
              className="admin-input"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
            />
          </label>

          <label className="admin-field">
            <span className="admin-label">Description</span>
            <textarea
              className="admin-textarea"
              name="description"
              value={form.description}
              onChange={handleChange}
            />
          </label>

          <label className="admin-field">
            <span className="admin-label">Clue</span>
            <textarea
              className="admin-textarea"
              name="clue"
              value={form.clue}
              onChange={handleChange}
            />
          </label>

          <label className="admin-checkbox">
            <input
              type="checkbox"
              name="compulsory"
              checked={form.compulsory}
              onChange={handleChange}
            />
            Compulsory
          </label>

          <label className="admin-field">
            <span className="admin-label">Tags (comma separated)</span>
            <input
              className="admin-input"
              name="tags"
              value={form.tags}
              onChange={handleChange}
              placeholder="science, math"
            />
          </label>

          <div>
            <button className="admin-btn" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save Main Question'}
            </button>
            <button className="admin-btn secondary" type="button" style={{ marginLeft: 10 }} onClick={loadList}>
              Refresh List
            </button>
            <div className="admin-tagline">Upsert behavior: same code updates existing.</div>
          </div>
        </form>
      </div>

      {list.length > 0 && (
        <div className="admin-card">
          <h2 className="admin-title" style={{ fontSize: 20 }}>Existing Main Questions</h2>
          <div className="small-muted">Loaded {list.length} items.</div>
          <div style={{ marginTop: 12 }}>
            {list.map(item => (
              <div key={item._id || item.code} className="admin-pill" style={{ marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <strong>{item.code}</strong>
                  <span style={{ marginLeft: 6 }}>{item.title}</span>
                  {item.compulsory && <span className="small-muted" style={{ marginLeft: 6 }}>(compulsory)</span>}
                </div>
                <button className="admin-btn secondary" type="button" onClick={() => handleEdit(item)}>Edit</button>
                <button
                  className="admin-btn danger"
                  type="button"
                  disabled={deleting === item.code}
                  onClick={() => handleDelete(item.code)}
                >
                  {deleting === item.code ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
