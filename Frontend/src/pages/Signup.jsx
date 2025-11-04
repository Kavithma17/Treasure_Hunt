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

  // Generate unique player key
  const generatePlayerKey = () => {
    // Using crypto.randomUUID() for unique ID
    const uuid = crypto.randomUUID();
    // Create a shorter, more readable key (8 characters)
    const shortKey = uuid.split('-')[0].toUpperCase();
    return `KEY-${shortKey}`;
  };

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
    
    // Validation
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    setError('');

    // Simulate API call (replace with your actual API)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate unique key
      const newKey = generatePlayerKey();
      setPlayerKey(newKey);
      
      // Store player data (you can replace this with actual API call)
      const playerData = {
        name: formData.name,
        
        key: newKey,
        timestamp: new Date().toISOString()
      };
      
      // Save to localStorage for demo (replace with your backend)
      localStorage.setItem('playerData', JSON.stringify(playerData));
      
      // Show the key
      setShowKey(true);
      
    } catch (err) {
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
    // Navigate to game with player data
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
                ⚠️ Save this key! You'll need it to continue your progress.
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
