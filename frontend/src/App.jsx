import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Link } from 'react-router-dom';
import Subscription from './pages/Subscription';
import Checkout from './pages/Checkout';
import WorkoutGenerator from './pages/WorkoutGenerator';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import AICoachCall from './pages/AICoachCall';
import Community from './pages/Community';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function AppContent() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [premiumUsesCount, setPremiumUsesCount] = useState(0);
  const [reportData, setReportData] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });
  
  // Rotating Hero Background Logic (A/B Testing / Dynamic Sets)
  const setA = [
    '/hero-1.webp',
    '/Hero-2.webp',
    '/Hero-3.webp',
    '/Hero-4.webp',
    '/Hero-5.webp',
    '/Hero-6.webp',
    '/Hero-13.webp'
  ];
  
  const setB = [
    '/hero-1.webp', // The common link (starts both sets)
    '/Hero-7.webp',
    '/Hero-8.webp',
    '/Hero-9.webp',
    '/Hero-10.webp',
    '/Hero-11.webp',
    '/Hero-12.webp',
    '/Hero-13.webp'
  ];

  const [heroImages, setHeroImages] = useState(setA);
  const [currentHeroImage, setCurrentHeroImage] = useState(0);

  useEffect(() => {
    // Check if the user has a designated "Hero Set" and when they got it
    const savedSet = localStorage.getItem('assignedHeroSet');
    const savedDate = localStorage.getItem('assignedHeroDate');
    const today = new Date().toDateString();

    let activeSet = setA;

    // If they have a saved set from TODAY, keep showing it to them
    if (savedSet && savedDate === today) {
      activeSet = savedSet === 'B' ? setB : setA;
    } else {
      // If it's a new day, or their first time visiting, flip a coin!
      const isSetB = Math.random() > 0.5;
      activeSet = isSetB ? setB : setA;
      
      // Save their new assignment for the rest of the day
      localStorage.setItem('assignedHeroSet', isSetB ? 'B' : 'A');
      localStorage.setItem('assignedHeroDate', today);
    }
    
    setHeroImages(activeSet);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % heroImages.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [heroImages]);

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
    
    const response = await fetch(`${API_BASE}/generate_report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ range }),
      credentials: 'include'
    });
    
    const data = await response.json();
    if ((response.status === 402 || response.status === 403) && (data.code === "LIMIT_EXCEEDED" || data.code === "UPGRADE_REQUIRED" || data.message === "UPGRADE_REQUIRED")) {
        navigate('/subscription');
        setReportData(null);
        return;
    }
    if (response.ok) {
      setReportData(data);
      if (userTier === 'Free') {
        setReportCount(prev => prev + 1);
      }
    } else {
      alert("Could not generate report.");
    }
  };
  // 1. Move Auth States to the top so other states can use them
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [userTier, setUserTier] = useState('Free');
  const [isGoogleFitConnected, setIsGoogleFitConnected] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); 

  // 2. Now define the other states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    if (isChatOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isChatOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const [mealLogCount, setMealLogCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
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
  const [showPassword, setShowPassword] = useState(false);

  const [progressData, setProgressData] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  // --- AUTO-SCROLL LOGIC ---
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [chatMessages, isChatOpen]); // Fires every time a new message is added or chat is reopened


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
      const response = await fetch(`${API_BASE}/analyze_meal`, {
        method: 'POST',
        body: formData,
        credentials: 'include' 
      });
      
      if (response.status === 429) {
        alert("Whoa there! You've uploaded too many images too quickly. Please wait 1 minute for the cooldown before trying again.");
        setIsAnalyzing(false);
        return;
      }
      
      const result = await response.json();
      if ((response.status === 402 || response.status === 403) && (result.code === "LIMIT_EXCEEDED" || result.code === "UPGRADE_REQUIRED" || result.message === "UPGRADE_REQUIRED")) {
         navigate('/subscription');
         setIsAnalyzing(false);
         return;
      }
      
      if (response.ok) {
          setAiResult(result);
          if (userTier === 'Free') {
            setMealLogCount(prev => prev + 1);
          }
          checkAuth(); 
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
      const response = await fetch(`${API_BASE}/get_progress`, {
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
              label: 'Calories Tracked (kcal)',
              data: data.map(entry => entry.calories || 0),
              borderColor: '#e67e22',
              backgroundColor: 'rgba(230, 126, 34, 0.2)',
              fill: true,
              tension: 0.4
            }]
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch progress", error);
    }
  };
  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_BASE}/check_session`, {
        method: 'GET',
        credentials: 'include' // Required to send the session cookie
      });
      if (response.ok) {
        const data = await response.json();
        setLoggedInUser(data.username);
        setUserTier(data.tier || 'Free');
        setMealLogCount(data.meal_logs_used || 0);
        setReportCount(data.reports_used || 0);
        setPremiumUsesCount(data.premium_uses || 0);
        setIsGoogleFitConnected(data.google_fit_connected || false);
      } else {
        localStorage.removeItem('chatMessages');
        setChatMessages([{ sender: 'ai', text: "Hey! I'm Coach Akki. Please LogIn to start chatting with me!!!" }]);
      }
    } catch (error) {
      console.log("No active session found.");
      localStorage.removeItem('chatMessages');
      setChatMessages([{ sender: 'ai', text: "Hey! I'm Coach Akki. Please LogIn to start chatting with me!!!" }]);
    }
  };

  useEffect(() => {
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

  const handleGoogleFitConnect = async () => {
    try {
      setToast({ show: true, message: "Connecting to Google Fit..." });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
      
      const res = await fetch(`${API_BASE}/oauth/google/login`, {credentials: 'include'});
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.auth_url;
      } else {
         setToast({ show: true, message: "Please login first!" });
         setTimeout(() => setToast({ show: false, message: '' }), 3000);
      }
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: "Failed to reach backend." });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
    }
  };

  const syncGoogleFitData = async () => {
     try {
       setToast({ show: true, message: "Pulling Data from Google Fit..." });
       const res = await fetch(`${API_BASE}/wearable/sync`, {method: 'POST', credentials: 'include'});
       const data = await res.json();
       if (res.ok) {
         setToast({ show: true, message: `Synced ${data.steps} steps from Google Fit!` });
         fetchProgress();
       } else {
         setToast({ show: true, message: data.message || "Failed to sync" });
       }
       setTimeout(() => setToast({ show: false, message: '' }), 3000);
     } catch(e) {
         setToast({ show: true, message: "Network error during sync." });
         setTimeout(() => setToast({ show: false, message: '' }), 3000);
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
    const response = await fetch(`${API_BASE}/send_message`, {
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
      const response = await fetch(`${API_BASE}/login`, {
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
      const response = await fetch(`${API_BASE}/register`, {
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
      const response = await fetch(`${API_BASE}/upgrade_to_pro`, {
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
    const response = await fetch(`${API_BASE}/logout`, { method: 'POST',credentials: 'include' });
      if (response.ok) {
      // 1. Reset all local states immediately
        setLoggedInUser(null);
        setUserTier('Free');
        setProgressData(null);
        setHistoryData([]);
        setAiResult(null);
        setIsGoogleFitConnected(false);

      // 2. Reset Coach Akki's welcome message
      localStorage.removeItem('chatMessages');
      setChatMessages([
        { sender: 'ai', text: "Hey! I'm Coach Akki. Please LogIn to start chatting with me!!!" }
      ]);
      
      // 3. Dispatch a global logout event so other components can clear their sensitive persistent state
      window.dispatchEvent(new Event('userLoggedOut'));
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
      const response = await fetch(`${API_BASE}/chat_with_ai`, {
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
    <h1 className="logo" onClick={() => { navigate('/'); window.scrollTo(0,0); }} style={{ cursor: 'pointer' }}>FitLife Hub</h1>
    
    {/* Desktop Navigation Links (Visible when NOT scrolled) */}
    <div className="desktop-nav">
      <ul className="nav-links">
        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick("hero"); setIsMenuOpen(false); }}>Home</a></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick("tracker"); setIsMenuOpen(false); }}>Tracker</a></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/workout'); setIsMenuOpen(false); }}>AI Workouts</a></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/coach-call'); setIsMenuOpen(false); }} style={{ color: '#2ecc71', fontWeight: 'bold' }}>AI Coach</a></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/community'); setIsMenuOpen(false); }} style={{ color: '#e67e22', fontWeight: 'bold' }}>🔥 Feed</a></li>
        <li onClick={() => { setIsMenuOpen(false); navigate('/subscription'); }} style={{cursor: 'pointer'}}><span style={{color: '#f1c40f', fontWeight: 'bold'}}>💎 Premium</span></li>
        
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
      <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/workout'); setIsMenuOpen(false); }}>AI Workouts</a></li>
      <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/coach-call'); setIsMenuOpen(false); }} style={{ color: '#2ecc71', fontWeight: 'bold' }}>AI Coach</a></li>
      <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/community'); setIsMenuOpen(false); }} style={{ color: '#e67e22', fontWeight: 'bold' }}>🔥 Feed</a></li>
      <li onClick={() => { setIsMenuOpen(false); navigate('/subscription'); }} style={{cursor: 'pointer'}}><span style={{color: '#f1c40f', fontWeight: 'bold'}}>💎 Premium</span></li>
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
            <section id="hero" className="hero-section" style={{
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('${heroImages[currentHeroImage]}')`,
              transition: 'background-image 1s ease-in-out'
            }}>
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
                <h4 style={{ margin: '0 0 15px 0' }}>Google Fit Sync</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={handleGoogleFitConnect} className="btn primary-btn" style={{ backgroundColor: 'var(--bg-main)', color: isGoogleFitConnected ? '#2ecc71' : 'var(--text-main)', width: '100%', cursor: 'pointer', border: isGoogleFitConnected ? '2px solid #2ecc71' : '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2em' }}>🔗</span> {isGoogleFitConnected ? "Connected ✅" : "Connect Google Fit"}
                  </button>
                  <button onClick={syncGoogleFitData} className="btn primary-btn" style={{ backgroundColor: '#3498db', color: '#fff', width: '100%', cursor: 'pointer', border: 'none' }}>
                    Pull Cloud Data
                  </button>
                </div>
              </div>

              <div style={{ padding: '20px', border: '2px solid #2ecc71', borderRadius: '15px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '2em', marginBottom: '5px' }}>🥗</div>
                <h4 style={{ margin: '0 15px 0' }}>AI Meal Logger {userTier === 'Free' ? `(${3 - mealLogCount} free ${3 - mealLogCount === 1 ? 'use' : 'uses'} left)` : ''}</h4>
                
                {/* Unified Camera/Browse Button as requested */}
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <label className="btn primary-btn" style={{ 
                    backgroundColor: '#2ecc71', 
                    width: '100%', 
                    maxWidth: '200px',
                    cursor: 'pointer', 
                    display: 'block',
                    textAlign: 'center'
                  }} onClick={(e) => {
                    if (userTier === 'Free' && mealLogCount >= 3) {
                      e.preventDefault();
                      navigate('/subscription');
                    }
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
            {/* Dashboard */}
            <div style={{ marginTop: '30px' }}>
              <AnalyticsDashboard historyData={historyData} />
            </div>

            {/* --- STRATEGIC ANALYTICS SECTION --- */}
            <div className="card-3d glow-effect" style={{ marginTop: '30px', padding: '30px' }}>
              <h3 style={{ color: '#2ecc71', marginBottom: '5px', fontSize: '1.2em' }}>📊 Strategic Analytics {userTier === 'Free' ? `(${7 - reportCount} free ${7 - reportCount === 1 ? 'use' : 'uses'} left)` : ''}</h3>
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
                    const response = await fetch(`${API_BASE}/download_report`, {
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
        <Route path="/checkout" element={<Checkout userTier={userTier} loggedInUser={loggedInUser} API_BASE={API_BASE} />} />
        <Route path="/workout" element={<WorkoutGenerator userTier={userTier} loggedInUser={loggedInUser} API_BASE={API_BASE} />} />
        <Route path="/community" element={<Community API_BASE={API_BASE} />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
      </Routes>
      <footer className="footer">
        <p>© 2026 FitLife Hub. All rights reserved.</p>
        <div className="footer-links" style={{ marginTop: '10px' }}>
          <Link to="/privacy" style={{ margin: '0 10px', color: '#2bd149', textDecoration: 'none', fontSize: '0.9em' }}>Privacy Policy</Link>
          <Link to="/terms" style={{ margin: '0 10px', color: '#25d545', textDecoration: 'none', fontSize: '0.9em' }}>Terms of Service</Link>
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
          <div style={{ position: 'relative', width: '100%' }}>
            <input type={showPassword ? "text" : "password"} placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required style={{ width: '100%', paddingRight: '40px' }} />
            <button type="button" onMouseEnter={() => setShowPassword(true)} onMouseLeave={() => setShowPassword(false)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: 'auto', margin: 0, padding: 0, display: 'flex' }}>
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </button>
          </div>
          <button type="submit" className="btn primary-btn">Login</button>
        </form>
      ) : (
        <form className="contact-form modal-form" onSubmit={handleRegister}>
          <h3>Start Your Journey</h3>
          <input type="text" placeholder="Choose Username" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} required />
          <input type="email" placeholder="Enter Email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
          <input type="tel" placeholder="WhatsApp Number (+91...)" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} required />
          <div style={{ position: 'relative', width: '100%' }}>
            <input type={showPassword ? "text" : "password"} placeholder="Create Password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required style={{ width: '100%', paddingRight: '40px' }} />
            <button type="button" onMouseEnter={() => setShowPassword(true)} onMouseLeave={() => setShowPassword(false)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: 'auto', margin: 0, padding: 0, display: 'flex' }}>
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </button>
          </div>
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
    <>
      <div 
        onClick={() => { setIsChatOpen(false); setIsFullScreen(false); }} 
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 1999,
          background: 'transparent'
        }}
      />
    <div style={{ 
        position: 'fixed', 
        top: isFullScreen ? (isScrolled ? '92px' : '82px') : 'auto', 
        bottom: isFullScreen ? '12px' : (window.innerWidth < 480 ? '20px' : '20px'), 
        right: window.innerWidth < 480 ? '10px' : '30px', 
        width: window.innerWidth < 480 ? (isFullScreen ? 'calc(100vw - 20px)' : 'calc(100vw - 20px)') : (isFullScreen ? 'calc(100vw - 60px)' : '350px'), 
        height: isFullScreen ? 'auto' : (window.innerWidth < 480 ? '70dvh' : '500px'), 
        background: 'var(--bg-card)', 
        borderRadius: '15px', 
        boxShadow: '0 15px 45px rgba(0,0,0,0.6)', 
        display: 'flex', 
        flexDirection: 'column', 
        border: '0.5px solid #54946c',
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
                <div className="chat-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                </div>
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
    </>
  )}
</div>
              </>
            );
          }



function OAuthCallback() {
  const navigate = useNavigate();
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
    
    if (code) {
      fetch(`${API_BASE}/oauth/google/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code })
      })
      .then(res => res.json())
      .then(data => {
        window.location.href = '/?oauth_success=true';
      })
      .catch(err => {
        window.location.href = '/?oauth_error=true';
      });
    }
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', color: 'var(--text-main)' }}>
      <h2 style={{ color: '#3498db' }}>Connecting to Google Fit...</h2>
      <p>Securely exchanging tokens. Please wait.</p>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/coach-call" element={<AICoachCall />} />
        <Route path="*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}
