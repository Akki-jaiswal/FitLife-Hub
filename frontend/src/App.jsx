import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Subscription from './pages/Subscription';
import Checkout from './pages/Checkout';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import ReactMarkdown from 'react-markdown';

// Register Chart.js modules
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function AppContent() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [premiumUsesCount, setPremiumUsesCount] = useState(0);
  const [reportData, setReportData] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage so the theme persists on refresh
    return localStorage.getItem('theme') === 'dark';
  });
  useEffect(() => {
    // Update the HTML attribute whenever state changes
    const theme = isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const fetchReport = async (range) => {
    if (userTier === 'Free' && reportCount >= 7) {
      navigate('/subscription');
      return;
    }
    setReportData({ report: "Coach Akki is calculating your trends...", avg_cal: '...', total_meals: '...' });
    
    const response = await fetch('http://localhost:5000/generate_report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ range }),
      credentials: 'include'
    });
    
    const data = await response.json();
    if (response.status === 403 && (data.code === "LIMIT_EXCEEDED" || data.code === "UPGRADE_REQUIRED")) {
        navigate('/subscription');
        setReportData(null);
        return;
    }
    if (response.ok) {
      setReportData(data);
      if (userTier === 'Free') {
        setReportCount(prev => {
          const next = prev + 1;
          localStorage.setItem('reportCount', next);
          return next;
        });
      }
    } else {
      alert("Could not generate report.");
    }
  };
  // 1. Move Auth States to the top so other states can use them
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [userTier, setUserTier] = useState('Free');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); 

  // 2. Now define the other states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const [mealLogCount, setMealLogCount] = useState(() => parseInt(localStorage.getItem('mealLogCount') || '0'));
  const [reportCount, setReportCount] = useState(() => parseInt(localStorage.getItem('reportCount') || '0'));
  const [chatMessages, setChatMessages] = useState(() => {
    const saved = localStorage.getItem('chatMessages');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return [{ sender: 'ai', text: "Hey! I'm Coach Akki. Please LogIn to start chatting with me!!!" }];
  });

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
  }, [chatMessages]);
  const [activeFaq, setActiveFaq] = useState(null);

  const [aiResult, setAiResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [authMessage, setAuthMessage] = useState(null);
  const [isAuthSuccess, setIsAuthSuccess] = useState(false);

  const [progressData, setProgressData] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  // --- AUTO-SCROLL LOGIC ---
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]); // Fires every time a new message is added


  const openModal = (mode) => {
    setAuthMode(mode);
    setIsModalOpen(true);
    setAuthMessage(null); 
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setAuthMessage(null); 
  };

  const handleMealInput = async (event) => {
    if (userTier === 'Free' && mealLogCount >= 3) {
      navigate('/subscription');
      return;
    }
    const file = event.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAiResult(null);

    const formData = new FormData();
    formData.append('meal_image', file);

    try {
      const response = await fetch('http://localhost:5000/analyze_meal', {
        method: 'POST',
        body: formData,
        credentials: 'include' 
      });
      
      const result = await response.json();
      if (response.status === 403 && (result.code === "LIMIT_EXCEEDED" || result.code === "UPGRADE_REQUIRED")) {
         navigate('/subscription');
         setIsAnalyzing(false);
         return;
      }
      
      if (response.ok) {
          setAiResult(result);
          if (userTier === 'Free') {
            setMealLogCount(prev => {
              const next = prev + 1;
              localStorage.setItem('mealLogCount', next);
              return next;
            });
          }
          fetchProgress(); 
      } else {
          alert("AI Server error. Check your backend terminal!");
      }
    } catch (error) {
      alert("Could not connect to AI Backend.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await fetch('http://localhost:5000/get_progress', {
        method: 'GET',
        credentials: 'include' 
      });
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setHistoryData(data);
          setProgressData({
            labels: data.map(entry => entry.date),
            datasets: [{
              label: 'Weight Progress (kg)',
              data: data.map(entry => entry.weight),
              borderColor: '#2ecc71',
              backgroundColor: 'rgba(46, 204, 113, 0.2)',
              fill: true,
              tension: 0.3
            }]
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch progress", error);
    }
  };
  useEffect(() => {
  const checkAuth = async () => {
    try {
      const response = await fetch('http://localhost:5000/check_session', {
        method: 'GET',
        credentials: 'include' // Required to send the session cookie
      });
      if (response.ok) {
        const data = await response.json();
        setLoggedInUser(data.username);
        setUserTier(data.tier || 'Free');
        setPremiumUsesCount(data.premium_uses || 0);
      }
    } catch (error) {
      console.log("No active session found.");
        }
      };
      checkAuth();
    }, []);

  useEffect(() => {
    if (loggedInUser) {
      fetchProgress();
      // Only set welcome message if chat is empty or has the generic unlogged message
      setChatMessages(prev => {
        if (prev.length <= 1 && prev[0].text.includes("Please LogIn")) {
          return [{ sender: 'ai', text: `Welcome back, ${loggedInUser}! I'm Coach Akki. Ready to audit your fitness data today?` }];
        }
        return prev;
      });
    }
  }, [loggedInUser]);

  const simulateSmartwatchSync = async () => {
    try {
      const steps = Math.floor(Math.random() * (12000 - 3000 + 1) + 3000);
      const calories = Math.floor(steps * 0.04);
      
      // Sending payload to our new Apple HealthKit Webhook
      const response = await fetch('http://localhost:5000/wearable/apple_health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          data_type: 'sync',
          steps: steps,
          calories: calories,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setToast({ show: true, message: "Apple HealthKit Synced! (4,500 Steps)" });
        fetchProgress();
        setTimeout(() => setToast({ show: false, message: '' }), 2000);
      }
    } catch (error) {
      setToast({ show: true, message: "Error syncing device." });
      setTimeout(() => setToast({ show: false, message: '' }), 2000);
    }
  };

  // Function to handle the Contact Form submission
  const handleContactSubmit = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const formData = { name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'), message: fd.get('message') };

  setToast({ show: true, message: "Sending your message... ⏳" });

  console.log("Form Submission Triggered:", formData);
  try {
    const response = await fetch('http://localhost:5000/send_message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      setToast({ show: true, message: "Message Sent Successfully! 🚀" });
      e.target.reset();
      setTimeout(() => setToast({ show: false, message: '' }), 2500); // Auto-hide
    }
    else {
      const errData = await response.json();
      setToast({ show: true, message: `Error: ${errData.message || 'Failed to send'}` });
  } 
}catch (error) {
    console.error("Fetch error:", error);
    setToast({ show: true, message: "Server connection failed." });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  }
};
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: loginIdentifier, password: loginPassword })
      });
      
      const result = await response.json();
      setIsAuthSuccess(response.ok);
      setAuthMessage(result.message);
      
      if (response.ok) {
        setLoggedInUser(result.username);
        setUserTier(result.tier || 'Free');
        setPremiumUsesCount(result.premium_uses || 0);
        setTimeout(() => closeModal(), 1500);
      }
    } catch (error) {
      setIsAuthSuccess(false);
      setAuthMessage("Backend not connected yet!");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          password: regPassword,
          phone_number: regPhone
        })
      });
      
      const result = await response.json();
      setIsAuthSuccess(response.ok);
      setAuthMessage(result.message);
      
      if (response.ok) {
        setTimeout(() => setAuthMode('login'), 1500); 
      }
    } catch (error) {
      setIsAuthSuccess(false);
      setAuthMessage("Backend not connected yet!");
    }
  };

    const handleUpgrade = async () => {
    try {
      const response = await fetch('http://localhost:5000/upgrade_to_pro', {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        setUserTier('Pro');
        setShowPricingModal(false);
        setToast({ show: true, message: "Welcome to FitLife Pro! 💎" });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
      }
    } catch (e) {
       console.log("Upgrade failed");
    }
  };

    const handleNavClick = (hash) => {
    setIsMenuOpen(false);
    navigate('/');
    setTimeout(() => {
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleLogout = async () => {
    try{
    const response = await fetch('http://localhost:5000/logout', { method: 'POST',credentials: 'include' });
      if (response.ok) {
      // 1. Reset all local states immediately
        setLoggedInUser(null);
        setUserTier('Free');
        setProgressData(null);
        setHistoryData([]);
        setAiResult(null);

      // 2. Reset Coach Akki's welcome message
      localStorage.removeItem('chatMessages');
      setChatMessages([
        { sender: 'ai', text: "Hey! I'm Coach Akki. Please LogIn to start chatting with me!!!" }
      ]);
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // --- CHATBOT SUBMISSION LOGIC ---
  const handleChatSubmit = async (e) => {
    e.preventDefault(); // Prevents page refresh on Enter
    if (!chatInput.trim()) return;

    // 1. Guard for logged-out users
    if (!loggedInUser) {
      setChatMessages(prev => [
        ...prev, 
        { sender: 'user', text: chatInput },
        { sender: 'ai', text: "Please login first to chat with Coach Akki." }
      ]);
      setChatInput('');
      return;
    }
    
    // 2. Add user message to UI immediately
    const currentInput = chatInput;
    const newMessages = [...chatMessages, { sender: 'user', text: currentInput }];
    setChatMessages(newMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
      // 3. Call the backend with message and history
      const response = await fetch('http://localhost:5000/chat_with_ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput, history: chatMessages }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      // 4. Add AI response to UI
      setChatMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { sender: 'ai', text: "Error connecting to coach. Check your backend!" }]);
    } finally {
      setIsChatLoading(false);
    }
  };
  return (
    <>
      {toast.show && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#2ecc71', color: 'var(--bg-card)', padding: '12px 25px', borderRadius: '30px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.2)', zIndex: 9999, animation: 'fadeInDown 0.5s'
        }}>
          {toast.message}
        </div>
      )}
      {/* Header-Section */}
<header id="top" className={`header ${isScrolled ? 'scrolled' : ''}`}>
  <div className="header-container">
    <h1 className="logo">FitLife Hub</h1>
    
    {/* Desktop Navigation Links (Visible when NOT scrolled) */}
    <div className="desktop-nav">
      <ul className="nav-links">
        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick("hero"); setIsMenuOpen(false); }}>Home</a></li>
        <li onClick={() => { setIsMenuOpen(false); navigate('/subscription'); }} style={{cursor: 'pointer'}}><span style={{color: '#f1c40f', fontWeight: 'bold'}}>💎 Premium</span></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick("quotes"); setIsMenuOpen(false); }}>Quotes</a></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick("benefits"); setIsMenuOpen(false); }}>Benefits</a></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick("tracker"); setIsMenuOpen(false); }}>Tracker</a></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick("testimonials"); setIsMenuOpen(false); }}>Testimonials</a></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick("contact"); setIsMenuOpen(false); }}>Contact</a></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick("faq"); setIsMenuOpen(false); }}>FAQ</a></li>
        
        <li>
          <button onClick={() => { toggleTheme(); setIsMenuOpen(false); }} className="theme-toggle-btn">
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </li>
  
        {loggedInUser ? (
          <>
            <li className="user-welcome">Hi, {loggedInUser}</li>
            <li>
              <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="btn logout-btn">
                SIGN OUT
              </button>
            </li>
          </>
        ) : (
          <li>
            <button onClick={() => { openModal('login'); setIsMenuOpen(false); }} className="btn primary-btn">Join Now / LogIN</button>
          </li>
        )}
      </ul>
    </div>
    
    {/* Hamburger Icon: This will animate to a Cross in CSS */}
    <button 
      className={`menu-toggle ${isMenuOpen ? 'active' : ''}`} 
      onClick={() => setIsMenuOpen(!isMenuOpen)}
      aria-label="Toggle navigation"
    >
      <span></span>
      <span></span>
      <span></span>
    </button>
  </div>
</header>

{/* Background Blur Overlay: Tapping anywhere here closes the menu */}
<div 
  className={`nav-overlay ${isMenuOpen ? 'active' : ''}`} 
  onClick={() => setIsMenuOpen(false)}
></div>

<nav className={`nav-drawer ${isMenuOpen ? 'open' : ''}`}>
  <button className="close-drawer" onClick={() => setIsMenuOpen(false)}>×</button>
  <ul className="nav-links">
      <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick("hero"); }}>Home</a></li>
      <li onClick={() => { setIsMenuOpen(false); navigate('/subscription'); }} style={{cursor: 'pointer'}}><span style={{color: '#f1c40f', fontWeight: 'bold'}}>💎 Premium</span></li>
      <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick("quotes"); }}>Quotes</a></li>
      <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick("benefits"); }}>Benefits</a></li>
      <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick("tracker"); }}>Tracker</a></li>
      <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick("testimonials"); }}>Testimonials</a></li>
      <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick("contact"); }}>Contact</a></li>
      <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick("faq"); }}>FAQ</a></li>
      
      <li>
        <button onClick={() => { toggleTheme(); setIsMenuOpen(false); }} className="theme-toggle-btn">
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </li>

      {loggedInUser ? (
        <>
          <li className="user-welcome">Hi, {loggedInUser}</li>
          <li>
            <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="btn logout-btn">
              SIGN OUT
            </button>
          </li>
        </>
      ) : (
        <li>
          <button onClick={() => { openModal('login'); setIsMenuOpen(false); }} className="btn primary-btn">Join Now / LogIN</button>
        </li>
      )}
    </ul>
  </nav>

      <Routes>
        <Route path="/" element={
          <>
            <section id="hero" className="hero-section">
        <div className="hero-content">
          <h2>Unlock Your Full Potential</h2>
          <p>Your journey to a healthier, stronger you starts here. Get motivated, track progress, and discover benefits</p>
          <a href="#tracker" className="btn primary-btn">Start Tracking Now</a>
          <a href="#benefits" className="btn secondary-btn">Learn More</a>
        </div>
      </section>

      {/* RESTORED: Quotes Section */}
      <section id="quotes" className="quotes-section">
        <h2>Daily Dose of Motivation</h2>
        <div className="quote-container">
          <p className="quote-text">"The only bad workout is the one that didn't happen."</p>
          <span className="quote-author">- Anonymous</span>
        </div>
        <div className="quote-container">
          <p className="quote-text">"Take care of your body. It's the only place you have to live."</p>
          <span className="quote-author">- Jim Rohn</span>
        </div>
        <div className="quote-container">
          <p className="quote-text">"Believe you can and you're halfway there."</p>
          <span className="quote-author">- Theodore Roosevelt</span>
        </div>
      </section>

      {/* RESTORED: Benefits Section */}
      <section id="benefits" className="benefits-section">
        <h2>Why Fitness Matters</h2>
        <div className="benefits-grid">
          <div className="benefit-card">
            <h3>Boost Energy</h3>
            <p>Regular exercise increases your energy levels and reduces fatigue.</p>
          </div>
          <div className="benefit-card">
            <h3>Improve Mood</h3>
            <p>Physical activity releases endorphins, which can help reduce stress and anxiety.</p>
          </div>
          <div className="benefit-card">
            <h3>Better Sleep</h3>
            <p>Consistent workouts can lead to deeper, more restorative sleep cycles.</p>
          </div>
          <div className="benefit-card">
            <h3>Stronger Body</h3>
            <p>Build muscle, strengthen bones, and enhance your overall physical resilience.</p>
          </div>
        </div>
      </section>

      <section id="tracker" className="tracker-section">
        <h2>Personal Progress Tracker</h2>
        {loggedInUser ? (
          <div className="tracker-container" style={{ maxWidth: '900px', margin: '0 auto', background: 'var(--bg-card)', padding: '40px', borderRadius: '20px', color: 'var(--text-main)', boxShadow: 'var(--shadow-main)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h3 style={{ color: '#2ecc71', fontSize: '2em', marginBottom: '10px' }}>Welcome, {loggedInUser}!</h3>
              <p style={{ color: 'var(--text-muted)' }}>Log your fitness data effortlessly using AI or Smartwatch Sync.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              <div style={{ padding: '20px', border: '2px solid #f0f0f0', borderRadius: '15px', textAlign: 'center' }}>
                <div style={{ fontSize: '2em', marginBottom: '10px' }}>⌚</div>
                <h4 style={{ margin: '0 0 15px 0' }}>Wearable Sync</h4>
                <button onClick={simulateSmartwatchSync} className="btn primary-btn" style={{ backgroundColor: '#3498db', width: '100%', cursor: 'pointer', border: '2px solid #079bfd' }}>
                  Sync Watch Data
                </button>
              </div>

              <div style={{ padding: '20px', border: '2px solid #2ecc71', borderRadius: '15px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '2em', marginBottom: '5px' }}>🥗</div>
                <h4 style={{ margin: '0 15px 0' }}>AI Meal Logger</h4>
                
                {/* FIXED: Wrapper now correctly contains the label for centering */}
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <label className="btn primary-btn" style={{ 
                    backgroundColor: '#2ecc71', 
                    width: '100%', 
                    maxWidth: '200px', // Prevents it from being too wide on split screen
                    cursor: 'pointer', 
                    display: 'block',
                    textAlign: 'center'
                  }}>
                    {isAnalyzing ? "AI Analyzing..." : "Camera / Browse"}
                    <input type="file" accept="image/*" capture="environment" onChange={handleMealInput} style={{ display: 'none' }} />
                  </label>
                </div>
                
                <p style={{ fontSize: '0.75em', color: 'var(--text-muted)', marginTop: '10px' }}>Snap a photo or upload from gallery</p>
              </div>
            </div>

            {/* UPGRADED & FIXED: AI Insight Card with High-Contrast Text */}
            {aiResult && (
              <div style={{ 
                backgroundColor: 'var(--bg-card)', 
                padding: '25px', 
                borderRadius: '15px', 
                marginBottom: '35px', 
                border: '1px solid #e0e0e0',
                boxShadow: 'var(--shadow-main)',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4 style={{ margin: 0, color: '#2ecc71', fontSize: '1.2em' }}>💎 AI Nutritional Insight</h4>
                  <div style={{ 
                    backgroundColor: aiResult.health_grade?.startsWith('A') ? '#2ecc71' : aiResult.health_grade?.startsWith('B') ? '#f1c40f' : '#e67e22', 
                    color: 'var(--bg-card)', 
                    padding: '6px 15px', 
                    borderRadius: '20px', 
                    fontWeight: 'bold',
                    fontSize: '0.9em'
                  }}>
                    Grade: {aiResult.health_grade || 'B'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ padding: '15px', background: 'var(--bg-tertiary)', borderRadius: '10px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.8em', color: 'var(--text-light)', fontWeight: 'bold' }}>IDENTIFIED MEAL</p>
                    <p style={{ margin: 0, color: 'var(--text-main)', fontWeight: '600' }}>{aiResult.meal_name}</p>
                  </div>
                  <div style={{ padding: '15px', background: 'var(--bg-tertiary)', borderRadius: '10px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.8em', color: 'var(--text-light)', fontWeight: 'bold' }}>EST. ENERGY</p>
                    <p style={{ margin: 0, color: 'var(--text-main)', fontWeight: '600' }} title="Estimated by AI based on standard nutritional data">{aiResult.calories} kcal ℹ️</p>
                  </div>
                </div>

                <div style={{ padding: '15px', background: 'rgba(230, 126, 34, 0.1)', borderRadius: '12px', borderLeft: '5px solid #e67e22', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ fontSize: '1.8em' }}>🔥</div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.85em', color: '#d35400', fontWeight: 'bold' }}>Activity Equivalent</p>
                    <p style={{ margin: 0, fontSize: '0.95em', color: 'var(--text-main)' }}>{aiResult.burn_off_tip}</p>
                  </div>
                </div>
              </div>
            )}
            {/* Chart */}
            <div style={{ position: 'relative', height: '40vh', width: '100%', background: 'var(--bg-card)', padding: '10px', borderRadius: '10px' }}>
              {progressData ? <Line data={progressData} options={{ maintainAspectRatio: false }} /> : <p>No history found.</p>}
            </div>

            {/* --- STRATEGIC ANALYTICS SECTION --- */}
            <div className="card-3d glow-effect" style={{ marginTop: '30px', padding: '30px' }}>
              <h3 style={{ color: '#2ecc71', marginBottom: '5px', fontSize: '1.2em' }}>📊 Strategic Analytics {userTier === 'Free' ? `🔒 (${7 - premiumUsesCount} free uses left)` : '💎'}</h3>
              <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Generate a deep-dive analysis of your habits over the last week or month.
              </p>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => fetchReport('7')} className="btn secondary-btn" style={{  padding: '8px 15px', fontSize: '0.9em', borderColor: 'var(--report-btn-border)', color: 'var(--report-btn-text)' }}>
                  Weekly Summary
                </button>
                <button onClick={() => fetchReport('30')} className="btn secondary-btn" style={{ padding: '8px 15px', fontSize: '0.9em', borderColor: 'var(--report-btn-border)', color: 'var(--report-btn-text)' }}>
                  Monthly Report
                </button>
              </div>

              {/* Display the AI Report Card if available */}
              {reportData && (
                <><div style={{ marginTop: '25px', padding: '25px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-color)', animation: 'fadeIn 0.5s ease' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <span style={{ fontWeight: 'bold' }}>Avg Calories: <span style={{ color: '#e67e22' }}>{reportData.avg_cal}</span></span>
                    <span style={{ fontWeight: 'bold' }}>Meals Logged: <span style={{ color: '#2ecc71' }}>{reportData.total_meals}</span></span>
                  </div>
                  <p style={{ fontSize: '0.95em', lineHeight: '1.6', color: 'var(--text-main)', whiteSpace: 'pre-line' }}>
                    {reportData.report}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const response = await fetch('http://localhost:5000/download_report', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(reportData),
                      credentials: 'include'
                    });
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${loggedInUser}'s_Report.pdf`;
                    a.click();
                  } }
                  className="btn primary-btn"
                  style={{ marginTop: '15px', backgroundColor: '#3498db', width: 'auto', padding: '10px 25px' }}
                >
                    📥 Download PDF Report
                  </button></>
              )}
            </div>
            {/* ---> THE PERMANENT MEAL HISTORY TABLE HERE <--- */}
            <div style={{ marginTop: '50px', borderTop: '2px solid #f0f0f0', paddingTop: '30px' }}>
              <h3 style={{ color: '#2ecc71', marginBottom: '20px' }}>📅 Recent Activity Log</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-light)' }}>
                      <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Date</th>
                      <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Meal Name</th>
                      <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Grade</th>
                      <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Calories</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* We reverse the array to show the newest entries at the top */}
                    {historyData && historyData.slice().reverse().map((entry, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #eee', transition: 'background 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '15px', color: 'var(--text-muted)' }}>{entry.date}</td>
                        <td style={{ padding: '15px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                          {entry.meal_name || 'Wearable Sync'}
                        </td>
                        <td style={{ padding: '15px' }}>
                          {entry.health_grade ? (
                            <span style={{ 
                              padding: '5px 12px', 
                              borderRadius: '15px', 
                              background: entry.health_grade.startsWith('A') ? '#2ecc71' : entry.health_grade.startsWith('B') ? '#f1c40f' : '#e67e22', 
                              color: 'var(--bg-card)', 
                              fontSize: '0.85em',
                              fontWeight: 'bold',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                            }}>
                              {entry.health_grade}
                            </span>
                          ) : (
                            <span style={{ color: '#aaa', fontStyle: 'italic' }}>N/A</span>
                          )}
                        </td>
                        <td style={{ padding: '15px', color: '#e67e22', fontWeight: 'bold' }}>
                          +{entry.calories || 0} kcal
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* ---> END OF HISTORY TABLE <--- */}
          </div>
        ) : (
          <div className="tracker-placeholder">
            <p>Log in to access AI tracking features.</p>
            <button onClick={() => openModal('login')} className="btn primary-btn">Login Now</button>
          </div>
        )}
      </section>

      {/* RESTORED: Testimonials Section */}
      <section id="testimonials" className="testimonials-section">
        <h2>What Our Users Say</h2>
        <div className="testimonial-grid">
          <div className="testimonial-card">
            <p>"FitLife Hub has transformed my fitness journey. The quotes keep me motivated!"</p>
            <span className="testimonial-author">- Sarah L.</span>
          </div>
          <div className="testimonial-card">
            <p>"I love the AI Meal Logger! It's so much easier than manually counting calories."</p>
            <span className="testimonial-author">- Mike D.</span>
          </div>
        </div>
      </section>

      {/* RESTORED: Contact Section */}
      <section id="contact" className="contact-section">
        <h2>Get In Touch</h2>
        <p>Have questions, feedback, or just want to share your fitness journey? We'd love to hear from you! Reach out to us 😃</p>
        <form className="contact-form" onSubmit={handleContactSubmit}>
          <input type="text" placeholder="Your Name" name="name" required />
          <input type="email" placeholder="Your Email" name="email" required />
          <input type="tel" placeholder="Your Phone Number" name="phone" required />
          <textarea placeholder="Your Message" name="message" required></textarea>
          <button type="submit" className="btn primary-btn">Send Message</button>
        </form>
      </section>

      {/* RESTORED: FAQ Section */}
      <section id="faq" className="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-container">
          {[
            {q: "What is FitLife Hub?", a: "FitLife Hub is your all-in-one platform for fitness motivation, progress tracking, and health insights. We provide daily inspiration and tools to help you achieve your fitness goals."},
            {q: "How can FitLife Hub help me?", a: "We offer motivational quotes to keep you going, a personal tracker to log your activities, and insights into the benefits of a healthy lifestyle. Our aim is to support your journey to a healthier, stronger you."},
            {q: "Is the tracker feature available?", a: "Yes! Once logged in, you can use our AI Meal Logger and Smartwatch Sync features to track your daily progress in real-time."},
            {q: "How do I contact support?", a: "You can reach out to us via the 'Get In Touch' section above or use the floating AI Chatbot in the bottom right corner for immediate assistance.."}
          ].map((item, idx) => (
            <details key={idx} className="faq-item" open={activeFaq === idx} onClick={(e) => { e.preventDefault(); setActiveFaq(activeFaq === idx ? null : idx); }}>
              <summary className="faq-question">{item.q}</summary>
              <div className="faq-answer">{item.a}</div>
            </details>
          ))}
        </div>
      </section>

                </>
        } />
        <Route path="/subscription" element={<Subscription userTier={userTier} handleUpgrade={handleUpgrade} handleContactSubmit={handleContactSubmit} loggedInUser={loggedInUser} />} />
        <Route path="/checkout" element={<Checkout userTier={userTier} loggedInUser={loggedInUser} />} />
      </Routes>
      <footer className="footer">
        <p>© 2026 FitLife Hub. All rights reserved.</p>
        <div className="footer-links" style={{ marginTop: '10px' }}>
          <a href="#top" style={{ margin: '0 10px', color: '#2bd149', textDecoration: 'none', fontSize: '0.9em' }}>Privacy Policy</a>
          <a href="#top" style={{ margin: '0 10px', color: '#25d545', textDecoration: 'none', fontSize: '0.9em' }}>Terms of Service</a>
        </div>
      </footer>


      {isModalOpen && (
  <div 
    id="auth-modal" 
    className="modal" 
    style={{ display: 'flex' }}
    /* TAP ANYWHERE ON OVERLAY TO CLOSE */
    onClick={(e) => { if(e.target.id === 'auth-modal') closeModal(); }}
  >
    <div className="modal-content">
      {/* HIGH VISIBILITY CLOSE BUTTON */}
      <button className="modal-close-btn" onClick={closeModal} aria-label="Close Modal">
        &times;
      </button>

      <div className="modal-tabs">
        <button className={`tab-btn ${authMode === 'login' ? 'active' : ''}`} onClick={() => setAuthMode('login')}>Login</button>
        <button className={`tab-btn ${authMode === 'register' ? 'active' : ''}`} onClick={() => setAuthMode('register')}>Sign Up</button>
      </div>
      
      {authMessage && (
        <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '5px', textAlign: 'center', backgroundColor: isAuthSuccess ? '#d4edda' : '#f8d7da', color: isAuthSuccess ? '#155724' : '#721c24' }}>
          {authMessage}
        </div>
      )}

      {authMode === 'login' ? (
        <form className="contact-form modal-form" onSubmit={handleLogin}>
          <h3>Welcome Back</h3>
          <input type="text" placeholder="Username or Email" value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)} required />
          <input type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
          <button type="submit" className="btn primary-btn">Login</button>
        </form>
      ) : (
        <form className="contact-form modal-form" onSubmit={handleRegister}>
          <h3>Start Your Journey</h3>
          <input type="text" placeholder="Choose Username" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} required />
          <input type="email" placeholder="Enter Email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
          <input type="tel" placeholder="WhatsApp Number (+91...)" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} required />
          <input type="password" placeholder="Create Password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
          <button type="submit" className="btn primary-btn">Sign Up</button>
        </form>
      )}
    </div>
  </div>
)}

        {/* --- FLOATING CHATBOT WIDGET --- */}
          {/* --- OPTIMIZED DOCKED CHATBOT --- */}
{/* --- FINAL CORRECTED FLOATING CHATBOT --- */}
<div style={{ 
  position: 'fixed', 
  bottom: '20px', 
  right: window.innerWidth < 480 ? '10px' : '30px', 
  zIndex: 1000 
  }}>
  {/* 1. Show the Toggle Button ONLY if chat is closed */}
  {!isChatOpen && (
    <button onClick={() => setIsChatOpen(true)} style={{ 
      width: window.innerWidth < 480 ? '55px' : '65px', 
      height: window.innerWidth < 480 ? '55px' : '65px', 
      borderRadius: '50%', 
      backgroundColor: '#2ecc71', 
      color: 'var(--bg-card)', 
      border: 'none', 
      fontSize: '1.8em', 
      cursor: 'pointer', 
      boxShadow: '0 8px 25px rgba(46, 204, 113, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      💬
    </button>
  )}

  {/* 2. Chat Window Logic */}
  {isChatOpen && (
    <div style={{ 
      position: 'fixed', 
      top: isFullScreen ? '74px' : 'auto', 
      bottom: isFullScreen ? '0' : (window.innerWidth < 480 ? '20px' : '20px'), 
      right: isFullScreen ? '0' : (window.innerWidth < 480 ? '10px' : '30px'), 
      width: isFullScreen ? '100vw' : (window.innerWidth < 480 ? '90vw' : '350px'), 
      height: isFullScreen ? 'calc(100vh - 74px)' : (window.innerWidth < 480 ? '70vh' : '500px'), 
      background: 'var(--bg-card)', 
      borderRadius: isFullScreen ? '0' : '15px', 
      boxShadow: '0 15px 45px rgba(79, 62, 62, 0.5)', 
      display: 'flex', 
      flexDirection: 'column', 
      border: isFullScreen ? 'none' : '0.5px solid #54946c',
      zIndex: 2000,
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
    }}>
      {/* High-Visibility Header */}
      <div style={{ 
        padding: '15px', 
        background: 'var(--chat-header-bg)', 
        color: 'var(--chat-header-text)', 
        fontWeight: 'bold', 
        display: 'flex', 
        alignItems: 'center',
        position: 'relative'
      }}>
        <button onClick={() => setIsFullScreen(!isFullScreen)} style={{ background: 'rgba(69, 68, 73, 0.2)', border: 'none', color: 'var(--chat-header-text)', cursor: 'pointer', fontSize: '1.1em', padding: '5px 8px', borderRadius: '6px', marginRight: '10px', display: 'flex', alignItems: 'center' }}>
          {isFullScreen ? '❐' : '⛶'}
        </button>

        <span style={{ flex: 1, textAlign: 'center', textShadow: '1px 1px 2px rgba(0,0,0,0.3)', fontSize: '1em' }}>
          FitLife Coach AI
        </span>

        <button onClick={() => { setIsChatOpen(false); setIsFullScreen(false); }} style={{ background: 'rgba(0,0,0,0.3)', border: 'none', color: 'var(--chat-header-text)', cursor: 'pointer', fontSize: '0.8em', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '10px' }}>
          ✕
        </button>
      </div>

        <div className="chat-messages" style={{ flex: 1, padding: '15px', backgroundColor: 'var(--bg-main)', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
          {chatMessages.map((msg, i) => (
            <div key={i} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', background: msg.sender === 'user' ? 'var(--chat-user-bg)' : 'var(--chat-ai-bg)', color: msg.sender === 'user' ? 'var(--chat-user-text)' : 'var(--chat-ai-text)', padding: '10px 15px', borderRadius: '15px', maxWidth: '85%', fontSize: '0.9em', boxShadow: '0 2px 5px rgba(0,0,0,0.5)', lineHeight: '1.6' }}>
              {msg.sender === 'ai' ? (
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              ) : (
                <span style={{ whiteSpace: 'pre-line' }}>{msg.text}</span>
              )}
            </div>
          ))}
          {isChatLoading && (
            <div style={{ alignSelf: 'flex-start', background: 'var(--chat-ai-bg)', color: 'var(--chat-ai-text)', padding: '10px 15px', borderRadius: '15px', maxWidth: '85%', fontSize: '0.9em', boxShadow: '0 2px 5px rgba(0,0,0,0.5)', display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span className="dot-typing"></span><span className="dot-typing"></span><span className="dot-typing"></span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

      {/* Form */}
      <form onSubmit={handleChatSubmit} style={{ padding: '12px', borderTop: '1px solid #eee', display: 'flex', gap: '8px', background: 'var(--bg-card)' }}>
        <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type here..." style={{ flex: 1, padding: '10px 15px', borderRadius: '25px', border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)', color: 'var(--input-text)', outline: 'none', fontSize: '16px' }} />
        <button type="submit" style={{ background: 'none', border: 'none', fontSize: '1.3em', cursor: 'pointer' }}>🚀</button>
      </form>
    </div>
  )}
</div>
              </>
            );
          }



export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
