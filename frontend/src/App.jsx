import React, { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js modules
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function App() {
  // 1. High-quality free fitness images
const heroImages = [
  "/images/photo-1517836357463-d25dfeac3438.jpg",
  "/images/pexels-photo-8346687.jpeg",
  "/images/pexels-photo-1954524.jpeg",
  "/images/pexels-photo-3838937.jpeg",
  "/images/pexels-cottonbro-5319390.jpg"
];

const [currentImageIndex, setCurrentImageIndex] = useState(0);

// 2. Timer to change images every 5 seconds
useEffect(() => {
  const timer = setInterval(() => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
  }, 5000); // Change image every 5000ms (5 seconds)
  
  return () => clearInterval(timer); // Cleanup on unmount
}, []);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
    setReportData({ report: "Coach Akki is calculating your trends...", avg_cal: '...', total_meals: '...' });
    
    const response = await fetch('http://localhost:5000/generate_report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ range }),
      credentials: 'include'
    });
    
    const data = await response.json();
    if (response.ok) {
      setReportData(data);
    } else {
      alert("Could not generate report.");
    }
  };
  // 1. Move Auth States to the top so other states can use them
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); 

  // 2. Now define the other states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: "Hey! I'm Coach Akki. Please LogIn to start chating with me!!!" }
  ]);
  const [activeFaq, setActiveFaq] = useState(null);

  const [aiResult, setAiResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
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
      
      if (response.ok) {
          setAiResult(result);
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
            backgroundColor: isDarkMode ? 'rgba(46, 204, 113, 0.1)' : 'rgba(46, 204, 113, 0.2)',
            fill: true,
            tension: 0.4, // Slightly smoother curve
            pointRadius: 4,
            pointBackgroundColor: '#2ecc71'
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
      // SMART WELCOME: Dynamically update the first message
          setChatMessages([
            { sender: 'ai', text: `Welcome back, ${loggedInUser}! I'm Coach Akki. Ready to audit your fitness data today?` }
          ]);
        } else {
          // RESET: Back to generic prompt on logout
          setChatMessages([
            { sender: 'ai', text: "Hey! I'm Coach Akki. Please LogIn to start chatting with me!!!" }
          ]);
        }
  }, [loggedInUser]);

  const simulateSmartwatchSync = async () => {
    try {
      const randomWeight = (70 + Math.random() * 2 - 1).toFixed(1); 
      const response = await fetch('http://localhost:5000/add_progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          weight: parseFloat(randomWeight),
          steps: Math.floor(Math.random() * 5000) + 5000,
          calories: Math.floor(Math.random() * 500) + 2000
        })
      });

      if (response.ok) {
        setToast({ show: true, message: "Smartwatch Synced Successfully! ⌚" });
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
  const formData = { name: fd.get('name'), email: fd.get('email'), message: fd.get('message') };

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
          password: regPassword
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

  const handleLogout = async () => {
    try{
    const response = await fetch('http://localhost:5000/logout', { method: 'POST',credentials: 'include' });
      if (response.ok) {
      // 1. Reset all local states immediately
        setLoggedInUser(null);
        setProgressData(null);
        setHistoryData([]);
        setAiResult(null);

      // 2. Reset Coach Akki's welcome message
      setChatMessages([
        { sender: 'ai', text: "Hey! I'm Coach Akki. Please LogIn to start chatting with me!!!" }
      ]);
      
      setToast({ show: true, message: "Logged out successfully! 👋" });
      setTimeout(() => setToast({ show: false, message: '' }), 2500);
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

    try {
      // 3. Call the backend
      const response = await fetch('http://localhost:5000/chat_with_ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      // 4. Add AI response to UI
      setChatMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { sender: 'ai', text: "Error connecting to coach. Check your backend!" }]);
    }
  };
  const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      grid: {
        color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      },
      ticks: {
        color: isDarkMode ? '#aaaaaa' : '#666666',
        font: { size: 12 }
      },
      title: {
        display: true,
        text: 'Weight (kg)',
        color: isDarkMode ? '#2ecc71' : '#27ae60'
      }
    },
    x: {
      grid: {
        display: false // Keeps the X-axis clean
      },
      ticks: {
        color: isDarkMode ? '#aaaaaa' : '#666666',
        font: { size: 11 }
      }
    }
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: isDarkMode ? '#ffffff' : '#333333',
        usePointStyle: true,
        font: { weight: 'bold' }
      }
    },
    tooltip: {
      backgroundColor: isDarkMode ? '#333' : '#fff',
      titleColor: isDarkMode ? '#2ecc71' : '#333',
      bodyColor: isDarkMode ? '#fff' : '#666',
      borderColor: '#2ecc71',
      borderWidth: 1
    }
  }
};
  // --- CHAT MESSAGE FORMATTER ---
  // This intercepts text like **Bold** and converts it to actual bold HTML
  // --- CHAT MESSAGE FORMATTER ---
  const formatMessage = (text) => {
    if (!text) return null;
    
    // 1. Split the text by looking for **bold text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, index) => {
      // If it's a bold segment, color it green
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} style={{ color: isDarkMode ? '#2ecc71' : '#27ae60' }}>{part.slice(2, -2)}</strong>;
      }
      
      // 2. For normal text, split again to find list numbers like "1. ", "2. "
      const subParts = part.split(/(\b\d+\.\s)/g);
      
      return (
        <span key={index}>
          {subParts.map((sub, subIndex) => {
            // If the piece is exactly a number followed by a dot and a space
            if (/^\d+\.\s$/.test(sub)) {
              // Use user bubble blue for light mode, brighter blue for dark mode
              return <strong key={subIndex} style={{ color: isDarkMode ? '#00f767' : '#27ae60' , marginRight: '4px' }}>{sub}</strong>;
            }
            return sub; // Return normal text as-is
          })}
        </span>
      );
    });
  };
  return (
    <>
      {toast.show && (
        <div style={{
          position: 'fixed', top: '100px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#2ecc71', color: 'white', padding: '12px 25px', borderRadius: '30px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.2)', zIndex: 9999, animation: 'fadeInDown 0.5s'
        }}>
          {toast.message}
        </div>
      )}
      {/* Header-Section */}
<header id="top"
 className="header"
 style={{ 
    // If chat is full screen, hide the header entirely
    display: (isChatOpen && isFullScreen) ? 'none' : 'flex' 
  }}
>
  <div className="header-container">

    <h1 className="logo">FitLife Hub</h1>
    
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

  {/* Background Blur Overlay: Tapping anywhere here closes the menu */}
  <div 
    className={`nav-overlay ${isMenuOpen ? 'active' : ''}`} 
    onClick={() => setIsMenuOpen(false)}
  ></div>

  <nav className={`nav-drawer ${isMenuOpen ? 'open' : ''}`}>
    <ul className="nav-links">
      <li><a href="#hero" onClick={() => setIsMenuOpen(false)}>Home</a></li>
      <li><a href="#quotes" onClick={() => setIsMenuOpen(false)}>Quotes</a></li>
      <li><a href="#benefits" onClick={() => setIsMenuOpen(false)}>Benefits</a></li>
      <li><a href="#tracker" onClick={() => setIsMenuOpen(false)}>Tracker</a></li>
      <li><a href="#testimonials" onClick={() => setIsMenuOpen(false)}>Testimonials</a></li>
      <li><a href="#contact" onClick={() => setIsMenuOpen(false)}>Contact</a></li>
      <li><a href="#faq" onClick={() => setIsMenuOpen(false)}>FAQ</a></li>
      
      <li>
        <button onClick={toggleTheme} className="theme-toggle-btn">
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </li>

      {loggedInUser ? (
        <>
          <li style={{ 
                color: '#2ecc71', /* Bright FitLife Green */
                fontWeight: 'bold', 
                textShadow: '0 1px 2px rgba(0,0,0,2)' /* Adds 'pop' against dark header */
              }}>
                Hi, {loggedInUser}
              </li>
          <li>
            <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="btn logout-btn">
              SIGN OUT
            </button>
          </li>
        </>
      ) : (
        <li>
          <button onClick={() => { openModal('login'); setLoginIsMenuOpen(false); }} className="btn primary-btn">Join Now / LogIN</button>
        </li>
      )}
    </ul>
  </nav>
</header>

      <section id="hero" className="hero-section"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${heroImages[currentImageIndex]})`,
        transition: 'background-image 1.2s ease-in-out', // Smooth crossfade
        width: '100%',
        backgroundSize: 'cover', /* The Premium Fill standard */
        backgroundPosition: 'center 20%', /* Keeps the focal point in the middle */
        backgroundRepeat: 'no-repeat',
        position: 'relative',
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
        <div className="attract-card">
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
          <div className="tracker-container" style={{ maxWidth: '900px', margin: '0 auto', background: 'var(--bg-card)', padding: '40px', borderRadius: '20px', color: 'var(--text-primary)', boxShadow: 'var(--shadow)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h3 style={{ color: 'var(--accent-green)', fontSize: '2em', marginBottom: '10px' }}>Welcome, {loggedInUser}!</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Log your fitness data effortlessly using AI or Smartwatch Sync.</p>
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
                
                <p style={{ fontSize: '0.75em', color: '#888', marginTop: '10px' }}>Snap a photo or upload from gallery</p>
              </div>
            </div>

            {/* UPGRADED & FIXED: AI Insight Card with High-Contrast Text */}
            {/* UPGRADED & FIXED: AI Insight Card with Dynamic Theme Support */}
            {aiResult && (
              <div style={{ 
                backgroundColor: 'var(--bg-card)', /* Adapts to dark/light theme */
                padding: '25px', 
                borderRadius: '15px', 
                marginBottom: '35px', 
                border: '1px solid var(--border-color)', /* Adapts to dark/light theme */
                boxShadow: 'var(--shadow, 0 4px 15px rgba(0,0,0,0.05))',
                textAlign: 'left',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4 style={{ margin: 0, color: '#2ecc71', fontSize: '1.2em' }}>🥗 AI Nutritional Insight</h4>
                  <div style={{ 
                    backgroundColor: aiResult.grade?.startsWith('A') ? '#2ecc71' : aiResult.grade?.startsWith('B') ? '#f1c40f' : '#e67e22', 
                    color: 'white', 
                    padding: '6px 15px', 
                    borderRadius: '20px', 
                    fontWeight: 'bold',
                    fontSize: '0.9em',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}>
                    Grade: {aiResult.grade || 'B'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ padding: '15px', background: 'var(--bg-main)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.8em', color: 'var(--text-secondary)', fontWeight: 'bold' }}>IDENTIFIED MEAL</p>
                    <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: '600' }}>{aiResult.description}</p>
                  </div>
                  <div style={{ padding: '15px', background: 'var(--bg-main)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.8em', color: 'var(--text-secondary)', fontWeight: 'bold' }}>EST. ENERGY</p>
                    <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: '600' }}>{aiResult.calories} kcal</p>
                  </div>
                </div>

                <div style={{ padding: '15px', background: isDarkMode ? 'rgba(230, 126, 34, 0.15)' : 'rgba(230, 126, 34, 0.1)', borderRadius: '12px', borderLeft: '5px solid #e67e22', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ fontSize: '1.8em' }}>🏃</div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.85em', color: isDarkMode ? '#f39c12' : '#d35400', fontWeight: 'bold' }}>Activity Equivalent</p>
                    <p style={{ margin: 0, fontSize: '0.95em', color: 'var(--text-primary)' }}>{aiResult.tip}</p>
                  </div>
                </div>
              </div>
            )}
            {/* Chart */}
            <div style={{ position: 'relative', height: '40vh', width: '100%', background: 'transparent', padding: '10px', borderRadius: '10px' }}>
              {progressData ? (
                <Line data={progressData} options={chartOptions} />
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No history found.</p>
              )}
            </div>
            {/* --- STRATEGIC ANALYTICS SECTION --- */}
{/* --- UPDATED PROFESSIONAL HEALTH INSIGHTS SECTION --- */}
<div className="insights-card">
  
  <div style={{ position: 'relative', zIndex: 5 }}> {/* Content Wrapper */}
    <h3 style={{ color: '#2ecc71', marginBottom: '8px', fontSize: '1.3em', textAlign: 'center' }}>
      📊 Professional Health Insights
    </h3>
    <p style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginBottom: '20px', textAlign: 'center' }}>
      Generate a deep-dive analysis of your habits over the last week or month.
    </p>
    
    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
      <button onClick={() => fetchReport('7')} className="insight-btn">
        Weekly Summary
      </button>
      <button onClick={() => fetchReport('30')} className="insight-btn">
        Monthly Report
      </button>
    </div>

    {/* Display the AI Report Card if available */}
    {reportData && (
      <div style={{ marginTop: '25px', animation: 'fadeIn 0.5s ease' }}>
        <div style={{ 
          padding: '20px', 
          background: 'var(--bg-main)', // Use theme bg instead of white
          borderRadius: '12px', 
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                Avg Calories: <span style={{ color: '#e67e22' }}>{reportData.avg_cal}</span>
            </span>
            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                Meals Logged: <span style={{ color: '#2ecc71' }}>{reportData.total_meals}</span>
            </span>
          </div>
          <p style={{ fontSize: '0.95em', lineHeight: '1.6', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
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
          }}
          className="btn primary-btn"
          style={{ marginTop: '15px', backgroundColor: '#3498db', width: '100%', padding: '12px' }}
        >
          📥 Download PDF Report
        </button>
      </div>
    )}
  </div>
</div>
            {/* ---> THE PERMANENT MEAL HISTORY TABLE HERE <--- */}
            <div style={{ marginTop: '50px', borderTop: '2px solid #f0f0f0', paddingTop: '30px' }}>
              <h3 style={{ color: '#2ecc71', marginBottom: '20px' }}>📅 Recent Activity Log</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', color: '#555' }}>
                      <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Date</th>
                      <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Meal Name</th>
                      <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Grade</th>
                      <th style={{ padding: '15px', borderBottom: '2px solid #eee' }}>Calories</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* We reverse the array to show the newest entries at the top */}
                    {historyData && historyData.slice().reverse().map((entry, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#fcfcfc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '15px', color: 'var(--text-secondary)' }}>{entry.date}</td>
                        <td style={{ padding: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                          {entry.meal_name || 'Wearable Sync'}
                        </td>
                        <td style={{ padding: '15px' }}>
                          {entry.health_grade ? (
                            <span style={{ 
                              padding: '5px 12px', 
                              borderRadius: '15px', 
                              background: entry.health_grade.startsWith('A') ? '#2ecc71' : entry.health_grade.startsWith('B') ? '#f1c40f' : '#e67e22', 
                              color: '#fff', 
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
          <textarea placeholder="Your Message" name="message" required></textarea>
          <button type="submit" className="btn primary-btn">Send Message</button>
        </form>
      </section>

      {/* RESTORED: FAQ Section */}
      <section id="faq" className="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="attract_card shine-effect">
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
        </div>
      </section>

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
  bottom: '35px',
top: isFullScreen ? '80px' : 'auto',
  right: isFullScreen ? '0' : (window.innerWidth < 480 ? '10px' : '30px'), 
  zIndex: 1000
  
}}>
  {/* 1. Show the Toggle Button ONLY if chat is closed */}
  {!isChatOpen && (
    <button onClick={() => setIsChatOpen(true)} style={{ 
      width: '60px', 
      height: '60px', 
      borderRadius: '50%', 
      backgroundColor: '#2ecc71', 
      color: 'white', 
      border: 'none', 
      fontSize: '1.8em', 
      cursor: 'pointer', 
      boxShadow: '0 8px 25px rgba(46, 204, 113, 0.4)',
      // display: 'flex',
      // alignItems: 'center',
      // justifyContent: 'center'
    }}>
      💬
    </button>
  )}

  {/* 2. Chat Window Logic */}
{/* 2. Chat Window Logic */}
  {isChatOpen && (
    <div style={{ 
      position: 'fixed',
      bottom: isFullScreen ? '0' : (window.innerWidth < 480 ? '20px' : '20px'), 
      right: isFullScreen ? '0' : (window.innerWidth < 480 ? '10px' : '30px'), 
      width: isFullScreen ? '100vw' : (window.innerWidth < 480 ? '90vw' : '350px'), 
      height: isFullScreen ? '100vh' : (window.innerWidth < 480 ? '70vh' : '500px'), 
      backgroundColor: 'var(--bg-card)', /* THE FIX: Adapts to Dark/Light Mode */
      borderRadius: isFullScreen ? '0' : '15px', 
      boxShadow: 'var(--shadow, 0 15px 45px rgba(0,0,0,0.4))', /* Dark mode friendly shadow */
      display: 'flex', 
      flexDirection: 'column', 
      border: isFullScreen ? 'none' : '1px solid #84f9b5', /* THE FIX */
      zIndex: 2000,
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
    }}>
      {/* High-Visibility Header (Keeping the premium green gradient) */}
      <div style={{ 
        padding: '15px', 
        background: isDarkMode ? 'var(--bg-header)' : 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)', 
        color: isDarkMode ? '#2ecc71' : 'white', 
        fontWeight: 'bold', 
        display: 'flex', 
        alignItems: 'center',
        borderBottom: isDarkMode ? '1px solid var(--border-color)' : 'none',
        position: 'relative'
      }}>
        <button onClick={() => setIsFullScreen(!isFullScreen)} style={{ background: isDarkMode ? 'var(--bg-card)' :'rgba(0, 0, 0, 0.2)', border: isDarkMode ? '1px solid var(--border-color)' : 'none', color: isDarkMode ? 'var(--text-primary)' : 'white', cursor: 'pointer', fontSize: '1.1em', padding: '5px 8px', borderRadius: '6px', marginRight: '10px', display: 'flex', alignItems: 'center' }}>
          {isFullScreen ? '❐' : '⛶'}
        </button>

        <span style={{ flex: 1, textAlign: 'center', textShadow: isDarkMode ? 'none' :'1px 1px 2px rgba(0,0,0,0.3)', fontSize: '1em' }}>
          FitLife Coach AI
        </span>

        <button onClick={() => { setIsChatOpen(false); setIsFullScreen(false); }} style={{ background: isDarkMode ? 'var(--bg-card)' : 'rgba(0,0,0,0.3)', 
          border: isDarkMode ? '1px solid var(--border-color)' : 'none', 
          color: isDarkMode ? 'var(--text-secondary)' : 'white', cursor: 'pointer', fontSize: '0.8em', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '10px' }}>
          ✕
        </button>
      </div>

      {/* Message Area */}
      <div className="hide-scrollbar" style={{ flex: 1, padding: '15px', overflowY: 'auto', backgroundColor: 'var(--bg-main)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {chatMessages.map((msg, i) => (
          <div key={i} style={{ 
            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', 
            backgroundColor: msg.sender === 'user' ? '#0f5f95' : 'var(--bg-card)', /* THE FIX: AI bubble syncs with theme */
            color: msg.sender === 'user' ? 'white' : 'var(--text-primary)', /* THE FIX: Text syncs with theme */
            border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)', /* Added for crispness in dark mode */
            padding: '10px 15px', 
            borderRadius: '15px', 
            maxWidth: '85%', 
            fontSize: '0.9em', 
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)', 
            lineHeight: '1.6', 
            whiteSpace: 'pre-line' 
          }}>
            {formatMessage(msg.text)}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Form Area */}
      <form onSubmit={handleChatSubmit} style={{ padding: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', backgroundColor: 'var(--bg-card)' }}>
        <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type here..." style={{ flex: 1, padding: '10px 15px', borderRadius: '25px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none', fontSize: '16px' }} />
        <button type="submit" style={{ background: 'none', border: 'none', fontSize: '1.3em', cursor: 'pointer' }}>🚀</button>
      </form>
    </div>
  )}
</div>
              </>
            );
          }

export default App;