import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AICoachCall() {
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [callStatus, setCallStatus] = useState('Disconnected'); // Disconnected, Listening, Thinking, Speaking

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const avatarRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Use refs for state accessed inside the SpeechRecognition callbacks to prevent closure hell
  const isListeningRef = useRef(false);
  const transcriptRef = useRef('');
  const selectedLanguageRef = useRef('en-US');
  const silenceTimerRef = useRef(null);
  const chatHistoryRef = useRef([]);

  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
    if (recognitionRef.current) {
      recognitionRef.current.lang = selectedLanguage;
    }
    // Clear conversation context when swapping languages
    chatHistoryRef.current = [];
    
    // Instantly cut off AI audio and reset text/microphone state when language switches
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.abort();
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    setAiResponse('');
    setTranscript('');
    setCallStatus('Disconnected');
    setIsListening(false);
    isListeningRef.current = false;
    setIsAISpeaking(false);
    
    if (avatarRef.current) {
      avatarRef.current.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.1)';
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
  }, [selectedLanguage]);

  useEffect(() => {
    // Initialize Web Speech API exactly once
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true; // Keep listening even if they pause
      rec.interimResults = true; // Show live text
      recognitionRef.current = rec;
      
      rec.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        const fullTranscript = finalTranscript + interimTranscript;
        transcriptRef.current = fullTranscript;
        setTranscript(fullTranscript);
        
        // Reset the silence timer every time they speak
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current) {
            recognitionRef.current.stop(); // Stop listening and trigger onend
          }
        }, 1200); // Aggressive 1.2 second cutoff for much faster AI response
      };

      rec.onend = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        // If we were actively listening, trigger the AI call with whatever text we captured
        if (isListeningRef.current) {
          isListeningRef.current = false;
          setIsListening(false);
          sendQueryToAI(transcriptRef.current);
        }
      };
      
      rec.onerror = (event) => {
        if (event.error !== 'aborted') {
          console.error("Speech Recognition Error:", event.error);
        }
        if (event.error === 'no-speech' && isListeningRef.current) {
          // just restart if no speech was detected
          try { rec.start(); } catch(e) {}
        }
        if (event.error === 'not-allowed') {
          alert("Microphone access is blocked! Please allow permissions in your browser.");
          setCallStatus('Disconnected');
          setIsListening(false);
          isListeningRef.current = false;
        }
      };
    } else {
      alert("Your browser does not support Speech Recognition. Please use Chrome/Edge/Safari.");
    }
    
    return () => {
      if (recognitionRef.current) {
        // Prevent onend from firing during cleanup
        recognitionRef.current.onend = null; 
        recognitionRef.current.abort();
      }
      if (audioRef.current) audioRef.current.pause();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []); // EMPTY dependency array!

  const sendQueryToAI = async (finalTranscript) => {
    if (!finalTranscript || !finalTranscript.trim()) {
      // If nothing was said, just go back to listening
      startListening();
      return;
    }
    
    setCallStatus('Thinking...');
    
    // Append the user's new query to history before sending
    const currentHistory = chatHistoryRef.current;
    
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
      const response = await fetch(`${API_BASE}/voice_stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            query: finalTranscript, 
            language: selectedLanguageRef.current,
            history: currentHistory 
        })
      });
      
      const data = await response.json();
      
      // Successfully got a response, append user message and AI response to history
      chatHistoryRef.current = [
          ...currentHistory,
          { role: 'user', content: finalTranscript },
          { role: 'assistant', content: data.text }
      ];
      if (data.error) throw new Error(data.error);
      
      setAiResponse(data.text);
      playAIAudio(data.audio_b64);
      
    } catch (error) {
      console.error(error);
      setAiResponse("Network Error. Coach is unreachable.");
      setCallStatus('Disconnected');
    }
  };

  const playAIAudio = (base64Audio) => {
    setCallStatus('Speaking');
    setIsAISpeaking(true);
    
    const audioSrc = "data:audio/mp3;base64," + base64Audio;
    
    if (!audioRef.current) {
      audioRef.current = new Audio(audioSrc);
    } else {
      audioRef.current.src = audioSrc;
    }
    
    // Setup Audio Context for Visualizer if not already setup
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      // Connect audio element to analyser
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }
    
    // Resume context if suspended (browser policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    audioRef.current.play().catch(e => console.error("Audio Playback Error:", e));
    visualizeAudio();
    
    audioRef.current.onended = () => {
      setIsAISpeaking(false);
      cancelAnimationFrame(animationFrameRef.current);
      // Reset avatar styling
      if (avatarRef.current) {
        avatarRef.current.style.transform = 'scale(1)';
        avatarRef.current.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.1)';
      }
      // Loop back to listening!
      startListening();
    };
  };

  const visualizeAudio = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const renderFrame = () => {
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Get average volume
      let sum = 0;
      for(let i=0; i<dataArray.length; i++) { sum += dataArray[i]; }
      const average = sum / dataArray.length;
      
      if (avatarRef.current) {
        // Scale between 1 and 1.15 based on volume
        const scale = 1 + (average / 255) * 0.15;
        // Shadow pulse based on volume
        const shadowSpread = 20 + (average / 255) * 50;
        
        avatarRef.current.style.transform = `scale(${scale})`;
        avatarRef.current.style.boxShadow = `0 0 ${shadowSpread}px ${shadowSpread/2}px rgba(46, 204, 113, 0.7)`;
      }
      
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };
    renderFrame();
  };

  const startListening = () => {
    if (audioRef.current) {
        audioRef.current.pause();
    }
    setCallStatus('Listening');
    setIsListening(true);
    isListeningRef.current = true;
    setTranscript('');
    transcriptRef.current = '';
    setAiResponse('');
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Silently ignore if already started
      }
    }
  };

  const toggleCall = () => {
    if (callStatus === 'Disconnected') {
      startListening();
    } else {
      setCallStatus('Disconnected');
      setIsListening(false);
      isListeningRef.current = false;
      setIsAISpeaking(false);
      setTranscript('');
      setAiResponse('');
      if (recognitionRef.current) recognitionRef.current.abort();
      if (audioRef.current) audioRef.current.pause();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (avatarRef.current) {
        avatarRef.current.style.transform = 'scale(1)';
        avatarRef.current.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.1)';
      }
    }
  };

  // Helper to get current avatar based on language
  const currentAvatar = selectedLanguage === 'hi-IN' ? '/hindi_coach.jpg' : '/english_coach.jpg';
  const coachName = selectedLanguage === 'hi-IN' ? 'Coach Sarah (Hindi)' : 'Coach Akki (English)';

  const handleLanguageSwap = (lang) => {
    if (lang === selectedLanguage) return;
    setSelectedLanguage(lang);
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: '#0a0a0f',
      backgroundImage: 'radial-gradient(circle at center, #1a1a2e 0%, #0a0a0f 100%)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Bar */}
      <div style={{ padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <button 
          onClick={() => {
            if (audioRef.current) audioRef.current.pause();
            if (recognitionRef.current) recognitionRef.current.abort();
            navigate('/');
          }}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.3s' }}
        >
          ← Exit Call
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => handleLanguageSwap('en-US')}
            style={{ background: selectedLanguage === 'en-US' ? 'var(--primary-color)' : 'transparent', color: '#fff', border: '1px solid var(--primary-color)', padding: '8px 16px', borderRadius: '15px', cursor: 'pointer', transition: 'all 0.3s' }}
          >
            English
          </button>
          <button 
            onClick={() => handleLanguageSwap('hi-IN')}
            style={{ background: selectedLanguage === 'hi-IN' ? 'var(--primary-color)' : 'transparent', color: '#fff', border: '1px solid var(--primary-color)', padding: '8px 16px', borderRadius: '15px', cursor: 'pointer', transition: 'all 0.3s' }}
          >
            Hindi / Hinglish
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        
        {/* Status Indicator */}
        <div style={{ marginBottom: '40px', fontSize: '1.2em', letterSpacing: '2px', color: callStatus === 'Disconnected' ? '#888' : 'var(--primary-color)', textTransform: 'uppercase' }}>
          {callStatus}
        </div>

        {/* 3D Hardware-Accelerated Avatar Flip Container */}
        <div 
          ref={avatarRef}
          style={{ 
            perspective: '1000px', 
            width: '250px', 
            height: '250px', 
            marginBottom: '20px',
            borderRadius: '50%',
            boxShadow: isListening 
                ? '0 0 40px 15px rgba(52, 152, 219, 0.5)' 
                : '0 0 20px rgba(255, 255, 255, 0.1)',
            border: `4px solid ${isAISpeaking ? '#2ecc71' : isListening ? '#3498db' : 'transparent'}`,
            animation: isListening ? 'pulse-blue 2s infinite' : 'none'
        }}>
          <div 
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              transition: 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)',
              transformStyle: 'preserve-3d',
              transform: selectedLanguage === 'hi-IN' ? 'rotateY(180deg)' : 'rotateY(0deg)',
              borderRadius: '50%'
          }}>
            {/* Front: English Coach */}
            <div style={{
              position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
              backfaceVisibility: 'hidden',
              backgroundImage: 'url(/english_coach.jpg)',
              backgroundSize: 'cover', backgroundPosition: 'center',
            }} />
            {/* Back: Hindi Coach */}
            <div style={{
              position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
              backfaceVisibility: 'hidden',
              backgroundImage: 'url(/hindi_coach.jpg)',
              backgroundSize: 'cover', backgroundPosition: 'center',
              transform: 'rotateY(180deg)'
            }} />
          </div>
        </div>
        <h2 style={{ margin: '10px 0 0 0', fontWeight: '500' }}>{coachName}</h2>

        {/* Live Transcripts */}
        <div style={{ marginTop: '50px', width: '80%', maxWidth: '600px', textAlign: 'center', minHeight: '100px' }}>
          <p style={{ fontSize: '1.2em', color: '#aaa', fontStyle: 'italic', transition: 'all 0.3s' }}>
            {transcript || (callStatus === 'Listening' ? "Listening for your fitness query..." : "...")}
          </p>
          <p style={{ fontSize: '1.4em', color: '#fff', fontWeight: 'bold', marginTop: '15px', transition: 'all 0.3s' }}>
            {aiResponse}
          </p>
        </div>

      </div>

      {/* Bottom Call Controls */}
      <div style={{ padding: '40px', display: 'flex', gap: '30px', justifyContent: 'center', zIndex: 10 }}>
        <button 
          onClick={toggleCall}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: callStatus === 'Disconnected' ? '#2ecc71' : '#e74c3c',
            color: '#fff',
            fontSize: '2em',
            cursor: 'pointer',
            boxShadow: `0 10px 30px ${callStatus === 'Disconnected' ? 'rgba(46, 204, 113, 0.5)' : 'rgba(231, 76, 60, 0.5)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s'
          }}
        >
          {callStatus === 'Disconnected' ? '📞' : '✖'}
        </button>
        
        {/* Manual Send Button (Bypasses 3-second wait) */}
        {callStatus === 'Listening' && (
          <button 
            onClick={() => {
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
              if (isListeningRef.current) {
                isListeningRef.current = false;
                setIsListening(false);
                if (recognitionRef.current) {
                  // abort() forcefully stops it instantly without waiting for the engine to wrap up
                  try { recognitionRef.current.abort(); } catch(e) {}
                }
                // Send the query immediately bypassing any onend delays
                sendQueryToAI(transcriptRef.current);
              }
            }}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#3498db',
              color: '#fff',
              fontSize: '2em',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(52, 152, 219, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s'
            }}
            title="Send Query Now"
          >
            ➤
          </button>
        )}
      </div>

      {/* CSS Keyframes for Audio Reactivity */}
      <style>{`
        @keyframes pulse-blue {
          0% { box-shadow: 0 0 20px 5px rgba(52, 152, 219, 0.3); transform: scale(1); }
          50% { box-shadow: 0 0 40px 15px rgba(52, 152, 219, 0.6); transform: scale(1.02); }
          100% { box-shadow: 0 0 20px 5px rgba(52, 152, 219, 0.3); transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
