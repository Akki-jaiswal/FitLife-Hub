import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Checkout = ({ userTier, loggedInUser }) => {
  const API_BASE = `http://${window.location.hostname}:5000`;
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [utr, setUtr] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);

  const validUntilDate = new Date();
  validUntilDate.setMonth(validUntilDate.getMonth() + 1);
  const formattedDate = validUntilDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Protect route
  useEffect(() => {
    window.scrollTo(0, 0);
    const timeoutId = setTimeout(() => {
      if (!loggedInUser) {
        alert('Please login first to access checkout.');
        navigate('/');
      } else if (userTier === 'Pro') {
        alert('You are already a Pro member! Enjoy your premium features.');
        navigate('/');
      }
    }, 800); // Give checkAuth time to resolve on a hard refresh
    
    return () => clearTimeout(timeoutId);
  }, [userTier, loggedInUser, navigate]);

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg('');

    try {
      const response = await fetch(`${API_BASE}/process_payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentMethod: 'upi', utr })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // We will force a page reload to cleanly reset the React tree and pull fresh user data from /check_session
        window.location.href = '/?payment_success=true';
      } else {
        setErrorMsg(data.message || 'Payment failed. Please try again.');
        setIsProcessing(false);
      }
    } catch (err) {
      setErrorMsg('Could not connect to payment server.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="checkout-page" style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="checkout-container card-3d" style={{ display: 'flex', flexWrap: 'wrap', maxWidth: '1000px', width: '90%', borderRadius: '20px', overflow: 'hidden' }}>
        
        {/* LEFT COLUMN: Payment Form */}
        <div className="checkout-form-side" style={{ flex: '1 1 500px', padding: '40px', background: 'var(--bg-card)' }}>
          <button onClick={() => navigate('/subscription')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '20px', fontSize: '1em' }}>
            &larr; Back to Plans
          </button>
          
          <h2 style={{ fontSize: '2em', color: 'var(--text-heading)', marginBottom: '10px' }}>Secure Checkout</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Enter your payment details below to unlock FitLife Pro.</p>

          
          {/* 3D Flipping QR Code Area */}
          <form onSubmit={handleCheckoutSubmit} style={{ textAlign: 'center', width: '100%' }}>
            <div 
              onClick={() => { if (!isFlipped) setIsFlipped(true); }}
              style={{ 
                perspective: '1000px', 
                width: '220px', 
                height: '220px', 
                margin: '0 auto 15px', 
                cursor: isFlipped ? 'default' : 'pointer' 
              }}
            >
              <div style={{
                width: '100%', height: '100%', position: 'relative',
                transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
              }}>
                {/* Front Face: Tap to Reveal Button */}
                <div style={{
                  position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                  background: 'rgba(46, 204, 113, 0.05)', border: '3px dashed #2ecc71', borderRadius: '20px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', 
                  color: 'var(--text-main)', boxShadow: '0 10px 25px rgba(46,204,113,0.2)'
                }}>
                  <span style={{ fontSize: '4em', marginBottom: '10px' }}>📱</span>
                  <h3 style={{ margin: 0, fontSize: '1.4em', color: 'var(--text-heading)' }}>Reveal QR Code</h3>
                  <p style={{ margin: '5px 0 0', fontSize: '0.9em', color: 'var(--text-muted)' }}>UPI Payment</p>
                </div>
                
                {/* Back Face: Actual QR Code */}
                <div style={{
                  position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                  background: '#ffffff', border: '3px solid #2ecc71', borderRadius: '20px', padding: '15px',
                  transform: 'rotateY(180deg)', boxShadow: '0 15px 30px rgba(0,0,0,0.15)',
                  display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" 
                    alt="Scan to Pay via UPI" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} 
                  />
                </div>
              </div>
            </div>
            
            <h3 style={{ color: 'var(--text-heading)', marginBottom: '5px' }}>Scan to Pay</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Use Google Pay, PhonePe, Paytm, or any UPI app.</p>
            
            <div style={{ marginBottom: '25px', textAlign: 'center' }}>
              <label style={{ color: 'var(--text-main)', fontSize: '0.9em', fontWeight: 'bold' }}>12-Digit UTR / Transaction ID</label>
              <input type="text" value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 312345678901" required style={{ width: '100%', maxWidth: '300px', padding: '12px', marginTop: '8px', marginBottom: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', textAlign: 'center', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
              <p style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '5px' }}>Enter the reference number from your UPI app so we can verify the funds.</p>
            </div>
            
            <button type="submit" className="btn primary-btn" disabled={isProcessing} style={{ width: '100%', maxWidth: '300px', fontSize: '1.2em', padding: '15px', background: '#27ae60', color: 'white', margin: '0 auto', display: 'block' }}>
              {isProcessing ? 'Connecting...' : 'Verify UPI Payment'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Order Summary */}
        <div className="checkout-summary-side glow-effect" style={{ boxShadow: "0 0 20px rgba(46, 204, 113, 0.2)", border: "1px solid #2ecc71", flex: '1 1 350px', padding: '40px', background: 'var(--bg-tertiary)', position: 'relative' }}>
          <h3 style={{ color: 'var(--text-heading)', fontSize: '1.5em', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', marginBottom: '20px' }}>Order Summary</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: 'var(--text-main)' }}>
            <span>FitLife Pro (Monthly)</span>
            <span>$9.00</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: 'var(--text-main)' }}>
            <span>Setup Fee</span>
            <span>$0.00</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: 'var(--text-main)' }}>
            <span>Valid Until</span>
            <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>{formattedDate}</span>
          </div>
          
          <div style={{ borderTop: '1px dashed var(--border-color)', margin: '20px 0' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-heading)', fontSize: '1.3em', fontWeight: 'bold', marginBottom: '30px' }}>
            <span>Total Today</span>
            <span style={{ color: '#2ecc71' }}>$9.00</span>
          </div>

          <ul className="features-list" style={{ color: 'var(--text-main)', fontSize: '0.9em' }}>
            <li>✓ Unlimited AI Meal Image Scanner</li>
            <li>✓ Unlimited Strategic PDF Reports</li>
            <li>✓ Priority AI Coach Access</li>
            <li>✓ 100% Ad-Free Experience</li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default Checkout;
