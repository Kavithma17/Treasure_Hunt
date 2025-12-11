import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Signup.css';

function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [playerKey, setPlayerKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [lang, setLang] = useState('en');

  const copy = {
    en: {
      label: 'English',
      howToTitle: 'How to Play',
      instructions: [
        'Answer 10 random questions to complete the hunt',
        'Question types: MCQ, Fill-in-the-Blank, QR Scan',
        'MCQ: One attempt only. Wrong answer = alternate question',
        'Fill-in-Blank & QR: Unlimited attempts until correct',
        'You must answer correctly to unlock the Next button'
      ],
      quickTitle: 'Quick Reminder',
      quickItems: [
        'Answer 10 questions correctly to win',
        'MCQ wrong? Get an alternate challenge',
        'Other questions: Try until you get it right!'
      ]
    },
    ta: {
      label: 'தமிழ்',
      howToTitle: 'விளையாடுவது எப்படி',
      instructions: [
        'வேட்டை முடிக்க 10 சீரற்ற கேள்விகளுக்கு பதிலளிக்கவும்',
        'கேள்வி வகைகள்: MCQ, வெற்றிடத்தை நிரப்பு, QR ஸ்கேன்',
        'MCQ: ஒரு முயற்சி בלבד. தவறான பதில் = மாற்று கேள்வி',
        'வெற்றிடமும் QRமும்: சரியாக வரும் வரை பல முயற்சிகள்',
        'Next பொத்தானைத் திறக்க சரியான பதில் அவசியம்'
      ],
      quickTitle: 'விரைவான நினைவூட்டல்',
      quickItems: [
        'ஜெயிக்க 10 கேள்விகளுக்கு சரியாக பதிலளிக்கவும்',
        'MCQ தவறானால் மாற்று சவால் கிடைக்கும்',
        'மற்ற கேள்விகள்: சரி வரும் வரை முயற்சிக்கவும்!'
      ]
    },
    si: {
      label: 'සිංහල',
      howToTitle: 'තරඟය සඳහා නීති රීති',
      instructions: [
        'අහඹු ලෙස සපයන ප්‍රශ්න 10 කට පිළිතුරු සෙවිය යුතුයි',
        'ප්‍රශ්න වර්ග: MCQ, හිස් තැන් පුරවීම, QR ස්කෑන්',
        'MCQ: එක් උත්සාහයක් පමණි. වැරදි නම් වෙනත් ප්‍රශ්නයක් හිමිවේ',
        'හිස්තැන්/QR: නිවැරදි පිළිතුරු ලබාදෙන තුරු බොහෝ අවස්තා හිමිවේ',
        'Next බොත්තම අගුලු හැරීමට නිවැරදි පිළිතුරු අවශ්‍යයි'
      ],
      quickTitle: 'ක්ෂණික සිහිකැඳවීම',
      quickItems: [
        'ජය ගැනීමට ප්‍රශ්න 10කට නිවැරදි පිළිතුරු දෙන්න',
        'MCQ වැරදි නම් විකල්ප අභියෝගයක් ලැබේ',
        'අනෙකුත් ප්‍රශ්න: නිවැරදි පිළිතුර දක්වා ඉදිරියට යන්න!'
      ]
    }
  };

  const t = copy[lang] || copy.en;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleStartGame = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }

    const trimmedName = formData.name.trim();

    setIsLoading(true);
    setError('');

    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
      const resp = await fetch(`${baseUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 409) {
          setError(err.error || 'That player name is already registered. Please choose another.');
          return;
        }
        throw new Error(err.error || 'Failed to register');
      }
      const data = await resp.json();
      setPlayerKey(data.key);
      setShowKey(true);
    } catch {
      setError('Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(playerKey);
    alert('Key copied to clipboard!');
  };

  const proceedToGame = () => {
    navigate('/game', { state: { playerKey, playerName: formData.name } });
  };

  return (
    <div className="signup-container">
      <div className="signup-background">
        <div className="scanline-signup"></div>
      </div>

      <div className="signup-content">
        {!showKey ? (
          // Registration Form
          <div className="signup-card">
            <div className="card-header">
              <div className="key-icon">🗝️</div>
              <h1 className="signup-title">Join the Hunt</h1>
              <p className="signup-subtitle">
                Enter your details to receive your unique player key
              </p>
            </div>

            {/* Game Instructions */}
            <div className="instructions-section">
              <div className="instructions-title-row">
                <h3 className="instructions-title">📜 {t.howToTitle}</h3>
                <div className="lang-switch">
                  <label className="lang-label" htmlFor="lang-select">Language</label>
                  <select
                    id="lang-select"
                    className="lang-select"
                    value={lang}
                    onChange={e => setLang(e.target.value)}
                  >
                    {Object.entries(copy).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="instructions-list">
                {t.instructions.map((text, idx) => (
                  <div className="instruction-item" key={idx}>
                    <span className="instruction-icon">{idx + 1}️⃣</span>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleStartGame} className="signup-form">
              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  {error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="name-input" className="form-label">
                  Player Name *
                </label>
                <input
                  id="name-input"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your name"
                  className="form-input"
                  required
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              <button 
                type="submit" 
                className="start-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Generating Key...
                  </>
                ) : (
                  <>
                    <span className="button-icon">🚀</span>
                    Start Hunt
                  </>
                )}
              </button>

              <div className="form-footer">
                <p>Already have a key? <a href="/login" className="link">Login here</a></p>
              </div>
            </form>
          </div>
        ) : (
          // Key Display Card
          <div className="signup-card key-card">
            <div className="success-animation">
              <div className="success-icon">✨</div>
            </div>

            <div className="card-header">
              <h1 className="signup-title">Welcome, {formData.name}!</h1>
              <p className="signup-subtitle">
                Your unique player key has been generated
              </p>
            </div>

            {/* Quick Instructions Reminder */}
            <div className="quick-reminder">
              <h4 className="reminder-title">🎯 {t.quickTitle}</h4>
              <ul className="reminder-list">
                {t.quickItems.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="key-display-section">
              <p className="key-label">Your Player Key</p>
              <div className="key-display">
                <span className="key-value">{playerKey}</span>
                <button 
                  onClick={copyToClipboard}
                  className="copy-button"
                  title="Copy to clipboard"
                >
                  📋
                </button>
              </div>
              <p className="key-warning">
                ⚠️ Save this key! You'll need it to log in again.
              </p>
            </div>

            <div className="key-info">
              <div className="info-item">
                <span className="info-icon">👤</span>
                <div>
                  <p className="info-title">Player Name</p>
                  <p className="info-value">{formData.name}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={proceedToGame}
              className="proceed-button"
            >
              <span className="button-icon">🎮</span>
              Start Playing Now
            </button>

            <div className="form-footer">
              <p className="small-text">
                Lost your key? Contact support or <a href="/signup" className="link">register again</a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SignupPage;
