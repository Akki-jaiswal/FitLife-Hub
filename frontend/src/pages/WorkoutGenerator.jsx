import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';

export default function WorkoutGenerator({ userTier, loggedInUser, API_BASE }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [workoutPlan, setWorkoutPlan] = useState(() => localStorage.getItem('workoutPlan') || null);
  const [plan4to6, setPlan4to6] = useState(() => localStorage.getItem('plan4to6') || null);
  const [isFlipped, setIsFlipped] = useState(() => localStorage.getItem('isFlipped') === 'true');

  // Sync state to localStorage. NEVER wipe automatically on reload!
  useEffect(() => {
    if (workoutPlan) localStorage.setItem('workoutPlan', workoutPlan);
    else localStorage.removeItem('workoutPlan');
  }, [workoutPlan]);

  useEffect(() => {
    if (plan4to6) localStorage.setItem('plan4to6', plan4to6);
    else localStorage.removeItem('plan4to6');
  }, [plan4to6]);

  useEffect(() => {
    localStorage.setItem('isFlipped', isFlipped);
  }, [isFlipped]);
  // Listen for explicit logout events to clear the plan instantly
  useEffect(() => {
    const handleLogout = () => {
      setWorkoutPlan(null);
      setPlan4to6(null);
      setIsFlipped(false);
      localStorage.removeItem('workoutPlan');
      localStorage.removeItem('plan4to6');
      localStorage.removeItem('isFlipped');
    };
    
    window.addEventListener('userLoggedOut', handleLogout);
    return () => window.removeEventListener('userLoggedOut', handleLogout);
  }, []);
  const generatePlan = async (daysRange) => {
    if (!loggedInUser) {
      setError("Please login first.");
      return;
    }
    if (userTier === 'Free') {
      navigate('/subscription');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/generate_workout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ days_range: daysRange }),
        credentials: 'include'
      });
      const data = await response.json();
      
      if (response.ok) {
        if (daysRange === "1-3") {
            setWorkoutPlan(data.plan);
            setPlan4to6(null); 
            setIsFlipped(false);
        } else if (daysRange === "4-6") {
            setPlan4to6(data.plan);
            setIsFlipped(true); 
        }
      } else {
        if (response.status === 402) {
          navigate('/subscription');
        } else {
          setError(data.message || "Failed to generate workout.");
        }
      }
    } catch (err) {
      setError("Network error connecting to AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
      setWorkoutPlan(null);
      setPlan4to6(null);
      setIsFlipped(false);
  };

  return (
    <div style={{ padding: '120px 20px 40px', minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)', textAlign: 'center' }}>
      <h2 style={{ color: '#2ecc71', fontSize: '2.5em', marginBottom: '10px' }}>AI Workout Generator</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
        Get a highly personalized daily workout plan designed specifically for you based on your recent dietary tracking.
      </p>

      {!workoutPlan && (
        <div style={{ background: 'var(--bg-card)', padding: '50px 30px', borderRadius: '20px', maxWidth: '700px', margin: '0 auto', boxShadow: 'var(--shadow-main)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '4em', marginBottom: '20px' }}>🏋️‍♂️</div>
            <h3 style={{ marginBottom: '15px' }}>Ready to Crush Your Goals?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Our AI engine analyzes your tracked calories and meals to build the perfect progressive overload plan for your body.</p>
            <button 
            onClick={() => generatePlan("1-3")} 
            className="btn primary-btn" 
            style={{ padding: '15px 40px', fontSize: '1.2em', cursor: loading ? 'wait' : 'pointer', boxShadow: '0 8px 25px rgba(46, 204, 113, 0.4)' }}
            disabled={loading}
            >
            {loading ? "Generating Plan (takes ~10s)..." : "Generate My Plan (Day 1-3)"}
            </button>
        </div>
      )}

      {error && <p style={{ color: '#e74c3c', marginTop: '20px' }}>{error}</p>}

      {workoutPlan && (
        <div style={{ 
            perspective: '1500px', 
            width: '100%', 
            maxWidth: '800px', 
            margin: '40px auto 0',
            height: '650px' /* Static fixed height for perfect flipping */
        }}>
            <div style={{
                width: '100%', height: '100%', position: 'relative',
                transition: 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}>
                
                {/* FRONT: Day 1-3 */}
                <div style={{ 
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                    background: 'var(--bg-card)', padding: '40px', borderRadius: '15px', boxShadow: 'var(--shadow-main)', border: '1px solid var(--border-color)',
                    transform: 'rotateY(0deg)',
                    display: 'flex', flexDirection: 'column',
                    pointerEvents: isFlipped ? 'none' : 'auto'
                }}>
                    <h3 style={{ color: '#3498db', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px', flexShrink: 0 }}>Phase 1: Days 1-3</h3>
                    <div className="markdown-body hide-scrollbar" style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '10px', marginBottom: '20px', lineHeight: '1.8', textAlign: 'left' }}>
                        <ReactMarkdown>{workoutPlan}</ReactMarkdown>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap', flexShrink: 0 }}>
                        <button onClick={handleStartOver} className="btn" style={{ border: '2px solid var(--text-main)', color: 'var(--text-main)', background: 'transparent' }} disabled={loading}>Start Over</button>
                        
                        {plan4to6 ? (
                            <button onClick={() => setIsFlipped(true)} className="btn primary-btn" style={{ backgroundColor: '#9b59b6', borderColor: '#9b59b6' }}>View Days 4-6 ➡️</button>
                        ) : (
                            <button onClick={() => generatePlan("4-6")} className="btn primary-btn" style={{ backgroundColor: '#9b59b6', borderColor: '#9b59b6' }} disabled={loading}>
                                {loading ? "Generating..." : "Generate Days 4-6 ➡️"}
                            </button>
                        )}
                    </div>
                </div>

                {/* BACK: Day 4-6 */}
                <div style={{ 
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                    background: 'var(--bg-card)', padding: '40px', borderRadius: '15px', boxShadow: 'var(--shadow-main)', border: '1px solid var(--border-color)',
                    transform: 'rotateY(180deg)',
                    display: 'flex', flexDirection: 'column',
                    pointerEvents: isFlipped ? 'auto' : 'none'
                }}>
                    <h3 style={{ color: '#9b59b6', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px', flexShrink: 0 }}>Phase 2: Days 4-6</h3>
                    <div className="markdown-body hide-scrollbar" style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '10px', marginBottom: '20px', lineHeight: '1.8', textAlign: 'left' }}>
                        <ReactMarkdown>{plan4to6 || "Loading..."}</ReactMarkdown>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap', flexShrink: 0 }}>
                        <button onClick={() => setIsFlipped(false)} className="btn primary-btn" style={{ backgroundColor: '#3498db', borderColor: '#3498db' }}>⬅️ Back to Days 1-3</button>
                        <button onClick={handleStartOver} className="btn" style={{ border: '2px solid var(--text-main)', color: 'var(--text-main)', background: 'transparent' }}>Start Over</button>
                    </div>
                </div>

            </div>
        </div>
      )}
    </div>
  );
}
