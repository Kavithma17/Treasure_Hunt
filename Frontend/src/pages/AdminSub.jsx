import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './Admin.css';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const defaultToken = import.meta.env.VITE_ADMIN_TOKEN || '';

const emptyOption = () => ({ id: '', text: '' });

export default function AdminSub() {
  const [token, setToken] = useState(defaultToken);
  const [type, setType] = useState('mcq');
  const [form, setForm] = useState({
    code: '',
    mainCode: '',
    prompt: '',
    clue: '',
    score: 1,
    timeLimitSec: 0,
    correctOptionId: '',
    fibAnswers: '',
    fibCaseSensitive: false,
    fibTrimInput: true,
    fibAcceptPartial: false,
    qrClue: '',
    qrAnswer: '',
    photoImageUrl: '',
    photoExpectedKey: '',
    photoCaseSensitive: false,
    photoTrimInput: true,
    photoAcceptPartial: false,
    active: true
  });
  const [options, setOptions] = useState([emptyOption(), emptyOption(), emptyOption()]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState([]);
  const [filterMainCode, setFilterMainCode] = useState('');
  const [editingCode, setEditingCode] = useState('');

  const handleField = (e) => {
    const { name, value, type: t, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: t === 'checkbox' ? checked : value }));
  };

  const handleOption = (idx, field, value) => {
    setOptions(prev => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  };

  const addOption = () => setOptions(prev => [...prev, emptyOption()]);
  const removeOption = (idx) => setOptions(prev => prev.filter((_, i) => i !== idx));

  const payload = useMemo(() => {
    const base = {
      ...form,
      type,
      options: options.filter(o => o.id.trim() && o.text.trim())
    };
    return base;
  }, [form, options, type]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const resp = await fetch(`${baseUrl}/api/admin/sub`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save sub question');
      }
      const data = await resp.json();
      setMessage(`Saved sub question ${data.code}`);
      setEditingCode('');
      loadList();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const loadList = async () => {
    setError('');
    try {
      const qs = filterMainCode.trim() ? `?mainCode=${encodeURIComponent(filterMainCode.trim())}` : '';
      const resp = await fetch(`${baseUrl}/api/admin/sub${qs}`, {
        headers: { 'x-admin-token': token }
      });
      if (!resp.ok) throw new Error('Failed to load sub questions');
      const data = await resp.json();
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteSub = async (code) => {
    if (!code) return;
    if (!window.confirm(`Delete sub question ${code}?`)) return;
    try {
      const resp = await fetch(`${baseUrl}/api/admin/sub/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token }
      });
      if (!resp.ok) throw new Error('Delete failed');
      await loadList();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (item) => {
    if (!item) return;
    setEditingCode(item.code || '');
    setType(item.type || 'mcq');
    setOptions(
      Array.isArray(item.options) && item.options.length
        ? item.options.map(o => ({ id: o.id || '', text: o.text || '' }))
        : [emptyOption(), emptyOption(), emptyOption()]
    );
    setForm({
      code: item.code || '',
      mainCode: item.mainCode || '',
      prompt: item.prompt || '',
      clue: item.clue || '',
      score: item.score ?? 1,
      timeLimitSec: item.timeLimitSec ?? 0,
      correctOptionId: item.correctOptionId || '',
      fibAnswers: Array.isArray(item.fib?.answers) ? item.fib.answers.join(', ') : '',
      fibCaseSensitive: item.fib?.caseSensitive ?? false,
      fibTrimInput: item.fib?.trimInput ?? true,
      fibAcceptPartial: item.fib?.acceptPartial ?? false,
      qrClue: item.qr?.clue || '',
      qrAnswer: item.qr?.answerHash || '',
      photoImageUrl: item.photo?.imageUrl || '',
      photoExpectedKey: item.photo?.expectedKey || '',
      photoCaseSensitive: item.photo?.caseSensitive ?? false,
      photoTrimInput: item.photo?.trimInput ?? true,
      photoAcceptPartial: item.photo?.acceptPartial ?? false,
      active: item.active ?? true
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingCode('');
    setType('mcq');
    setOptions([emptyOption(), emptyOption(), emptyOption()]);
    setForm({
      code: '',
      mainCode: '',
      prompt: '',
      clue: '',
      score: 1,
      timeLimitSec: 0,
      correctOptionId: '',
      fibAnswers: '',
      fibCaseSensitive: false,
      fibTrimInput: true,
      fibAcceptPartial: false,
      qrClue: '',
      qrAnswer: '',
      photoImageUrl: '',
      photoExpectedKey: '',
      photoCaseSensitive: false,
      photoTrimInput: true,
      photoAcceptPartial: false,
      active: true
    });
  };

  return (
    <div className="admin-shell">
      <div className="admin-card">
        <h1 className="admin-title">Admin · Sub Questions</h1>
        <p className="admin-subtitle">Supports MCQ, Fill-in-Blank, QR, and Photo tasks.</p>

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
          <Link to="/admin/main" className="admin-btn secondary">Back to Main</Link>
        </div>

        {message && <div className="admin-success">{message}</div>}
        {error && <div className="admin-error">{error}</div>}

        {editingCode && (
          <div className="admin-notice">Editing: {editingCode}</div>
        )}

        <form onSubmit={submit} className="admin-grid" style={{ marginTop: 16 }}>
          <label className="admin-field">
            <span className="admin-label">Code *</span>
            <input className="admin-input" name="code" value={form.code} onChange={handleField} required />
          </label>

          <label className="admin-field">
            <span className="admin-label">Main Code *</span>
            <input className="admin-input" name="mainCode" value={form.mainCode} onChange={handleField} required />
          </label>

          <label className="admin-field">
            <span className="admin-label">Type *</span>
            <select className="admin-select" value={type} onChange={e => setType(e.target.value)}>
              <option value="mcq">MCQ</option>
              <option value="fib">Fill in the Blank</option>
              <option value="qr">QR</option>
              <option value="photo">Photo</option>
            </select>
          </label>

          <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
            <span className="admin-label">Prompt *</span>
            <textarea className="admin-textarea" name="prompt" value={form.prompt} onChange={handleField} required />
          </label>

          <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
            <span className="admin-label">Clue</span>
            <textarea className="admin-textarea" name="clue" value={form.clue} onChange={handleField} />
          </label>

          <label className="admin-field">
            <span className="admin-label">Score</span>
            <input type="number" className="admin-input" name="score" value={form.score} onChange={handleField} />
          </label>

          <label className="admin-field">
            <span className="admin-label">Time Limit (sec)</span>
            <input type="number" className="admin-input" name="timeLimitSec" value={form.timeLimitSec} onChange={handleField} />
          </label>

          <label className="admin-checkbox">
            <input type="checkbox" name="active" checked={form.active} onChange={handleField} /> Active
          </label>

          {type === 'mcq' && (
            <div className="admin-field" style={{ gridColumn: '1 / -1' }}>
              <span className="admin-label">MCQ Options</span>
              <div className="small-muted">Set id like A, B, C. Correct option id must match one of them.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {options.map((opt, idx) => (
                  <div key={idx} className="option-row">
                    <input
                      className="admin-input"
                      placeholder="ID"
                      value={opt.id}
                      onChange={e => handleOption(idx, 'id', e.target.value)}
                    />
                    <input
                      className="admin-input"
                      placeholder="Option text"
                      value={opt.text}
                      onChange={e => handleOption(idx, 'text', e.target.value)}
                    />
                    <button type="button" onClick={() => removeOption(idx)}>Remove</button>
                  </div>
                ))}
                <div className="admin-inline">
                  <button type="button" className="admin-btn secondary" onClick={addOption}>Add option</button>
                  <label className="admin-field" style={{ flex: 1 }}>
                    <span className="admin-label">Correct Option ID *</span>
                    <input className="admin-input" name="correctOptionId" value={form.correctOptionId} onChange={handleField} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {type === 'fib' && (
            <div className="admin-field" style={{ gridColumn: '1 / -1' }}>
              <span className="admin-label">Accepted Answers (comma separated)</span>
              <input className="admin-input" name="fibAnswers" value={form.fibAnswers} onChange={handleField} />
              <div className="admin-inline">
                <label className="admin-checkbox">
                  <input type="checkbox" name="fibCaseSensitive" checked={form.fibCaseSensitive} onChange={handleField} />
                  Case sensitive
                </label>
                <label className="admin-checkbox">
                  <input type="checkbox" name="fibTrimInput" checked={form.fibTrimInput} onChange={handleField} />
                  Trim input
                </label>
                <label className="admin-checkbox">
                  <input type="checkbox" name="fibAcceptPartial" checked={form.fibAcceptPartial} onChange={handleField} />
                  Accept partial
                </label>
              </div>
            </div>
          )}

          {type === 'qr' && (
            <div className="admin-field" style={{ gridColumn: '1 / -1' }}>
              <span className="admin-label">QR Answer (exact match)</span>
              <input className="admin-input" name="qrAnswer" value={form.qrAnswer} onChange={handleField} />
              <span className="admin-label">QR Clue</span>
              <textarea className="admin-textarea" name="qrClue" value={form.qrClue} onChange={handleField} />
            </div>
          )}

          {type === 'photo' && (
            <div className="admin-field" style={{ gridColumn: '1 / -1' }}>
              <span className="admin-label">Photo Image URL (optional)</span>
              <input className="admin-input" name="photoImageUrl" value={form.photoImageUrl} onChange={handleField} />
              <span className="admin-label">Expected Key *</span>
              <input className="admin-input" name="photoExpectedKey" value={form.photoExpectedKey} onChange={handleField} />
              <div className="admin-inline">
                <label className="admin-checkbox">
                  <input type="checkbox" name="photoCaseSensitive" checked={form.photoCaseSensitive} onChange={handleField} />
                  Case sensitive
                </label>
                <label className="admin-checkbox">
                  <input type="checkbox" name="photoTrimInput" checked={form.photoTrimInput} onChange={handleField} />
                  Trim input
                </label>
                <label className="admin-checkbox">
                  <input type="checkbox" name="photoAcceptPartial" checked={form.photoAcceptPartial} onChange={handleField} />
                  Accept partial
                </label>
              </div>
            </div>
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <button className="admin-btn" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save Sub Question'}
            </button>
            <button className="admin-btn secondary" type="button" style={{ marginLeft: 10 }} onClick={resetForm}>
              Reset form
            </button>
            <div className="admin-tagline">Upsert behavior: using the same code updates the existing sub question.</div>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h2 className="admin-title" style={{ fontSize: 20 }}>Sub Questions List</h2>
        <div className="admin-inline" style={{ marginBottom: 12 }}>
          <input
            className="admin-input"
            style={{ maxWidth: 240 }}
            placeholder="Filter by mainCode (optional)"
            value={filterMainCode}
            onChange={e => setFilterMainCode(e.target.value)}
          />
          <button type="button" className="admin-btn secondary" onClick={loadList}>Load List</button>
        </div>
        {list.length === 0 && <div className="small-muted">No sub questions loaded. Click Load List.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(item => (
            <div key={item._id || item.code} className="admin-pill" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong>{item.code}</strong>
                <span className="small-muted">main: {item.mainCode} · type: {item.type}</span>
                <span>{item.prompt}</span>
              </div>
              <div className="admin-inline">
                <button type="button" className="admin-btn secondary" onClick={() => startEdit(item)}>Edit</button>
                <button type="button" onClick={() => deleteSub(item.code)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
