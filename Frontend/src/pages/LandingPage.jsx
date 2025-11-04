import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

function LandingPage({ user }) {
  const [statsInView, setStatsInView] = useState(false);
  const [counts, setCounts] = useState({ projects: 0, keys: 0, treasure: 0 });
  const statsRef = useRef(null);

  // Intersection Observer for stats animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsInView(true);
        }
      },
      { threshold: 0.5 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Counter animation
  useEffect(() => {
    if (!statsInView) return;

    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      setCounts({
        projects: Math.floor((200 * step) / steps),
        keys: Math.floor((10 * step) / steps),
        treasure: step >= steps ? 1 : 0
      });

      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [statsInView]);

  return (
    <div className="landing-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="scanline"></div>
        
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Welcome to <span className="gradient-text">Treasure Hunt</span>
            </h1>
            
            <p className="hero-subtitle">
              Uncover secrets, solve puzzles, and race to find the final treasure in this thrilling CTF-style treasure hunt!
            </p>

            {/* Stats Counter */}
            <div ref={statsRef} className="stats-grid">
              <div className="stat-card">
                <div className="stat-number gradient-cyan">
                  {counts.projects}+
                </div>
                <div className="stat-label">Projects</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-number gradient-purple">
                  {counts.keys}
                </div>
                <div className="stat-label">Hidden Keys</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-number gradient-green">
                  {counts.treasure}
                </div>
                <div className="stat-label">Grand Treasure</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="cta-buttons">
              {!user ? (
                <>
                  <Link to="/signup" className="btn btn-primary">
                    <span className="btn-icon">🗝️</span>
                    Join the Hunt
                  </Link>
                  
                  <Link to="/login" className="btn btn-secondary">
                    <span className="btn-icon">🏁</span>
                    Continue Game
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/game" className="btn btn-primary">
                    <span className="btn-icon">💡</span>
                    Start Solving
                  </Link>
                  
                  <Link to="/leaderboard" className="btn btn-secondary">
                    <span className="btn-icon">🏆</span>
                    View Leaderboard
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="hero-fade"></div>
      </section>


    </div>
  );
}

export default LandingPage;
