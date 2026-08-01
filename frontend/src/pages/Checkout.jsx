import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Checkout = ({ userTier, loggedInUser }) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [utr, setUtr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');

  // Protect route
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!loggedInUser) {
      alert('Please login first to access checkout.');
      navigate('/');
    } else if (userTier === 'Pro') {
      navigate('/');
    }
  }, [userTier, navigate]);

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg('');

    try {
      const response = await fetch('http://localhost:5000/process_payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentMethod, utr })
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

          
          {/* Payment Method Toggle - Large Professional Size */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
            <button 
              onClick={() => setPaymentMethod('card')}
              style={{ 
                flex: 1, 
                padding: '30px 20px', 
                borderRadius: '15px', 
                border: paymentMethod === 'card' ? '3px solid #2ecc71' : '2px solid var(--border-color)', 
                background: paymentMethod === 'card' ? 'rgba(46, 204, 113, 0.05)' : 'var(--bg-tertiary)', 
                color: 'var(--text-main)', 
                fontSize: '1.4em', 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                boxShadow: paymentMethod === 'card' ? '0 10px 20px rgba(46, 204, 113, 0.15)' : 'none'
              }}>
              <span style={{ fontSize: '1.8em' }}>💳</span>
              Credit / Debit Card
            </button>
            
            <button 
              onClick={() => setPaymentMethod('upi')}
              style={{ 
                flex: 1, 
                padding: '30px 20px', 
                borderRadius: '15px', 
                border: paymentMethod === 'upi' ? '3px solid #2ecc71' : '2px solid var(--border-color)', 
                background: paymentMethod === 'upi' ? 'rgba(46, 204, 113, 0.05)' : 'var(--bg-tertiary)', 
                color: 'var(--text-main)', 
                fontSize: '1.4em', 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                boxShadow: paymentMethod === 'upi' ? '0 10px 20px rgba(46, 204, 113, 0.15)' : 'none'
              }}>
              <span style={{ fontSize: '1.8em' }}>📱</span>
              UPI App (QR Code)
            </button>
          </div>

          {errorMsg && <div style={{ background: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', padding: '10px', borderRadius: '5px', marginBottom: '20px', border: '1px solid #e74c3c' }}>{errorMsg}</div>}

          {paymentMethod === 'card' ? (
          <form onSubmit={handleCheckoutSubmit} className="contact-form" autoComplete="off">
            <label style={{ color: 'var(--text-main)', fontSize: '0.9em', fontWeight: 'bold' }}>Cardholder Name</label>
            <input type="text" placeholder={loggedInUser || "John Doe"} autoComplete="new-password" required style={{ marginBottom: '20px' }} />

            <label style={{ color: 'var(--text-main)', fontSize: '0.9em', fontWeight: 'bold' }}>Card Number</label>
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2em' }}>💳</span>
              <input type="text" placeholder="4242 4242 4242 4242" autoComplete="new-password"  required style={{ paddingLeft: '45px' }} />
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: 'var(--text-main)', fontSize: '0.9em', fontWeight: 'bold' }}>Expiry Date</label>
                <input 
                  type="text" 
                  defaultValue={
                    String(new Date(new Date().setMonth(new Date().getMonth() + 1)).getMonth() + 1).padStart(2, '0') + 
                    '/' + 
                    String(new Date(new Date().setMonth(new Date().getMonth() + 1)).getFullYear()).slice(-2)
                  } 
                  autoComplete="new-password" 
                  required 
                />
              </div>
            </div>

            <button type="submit" className="btn primary-btn" disabled={isProcessing} style={{ width: '100%', fontSize: '1.2em', padding: '15px', position: 'relative' }}>
              {isProcessing ? 'Processing Payment...' : 'Pay $9.00'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '15px' }}>
              🔒 256-bit SSL Encrypted Secure Checkout
            </p>
          </form>
          ) : (
          <form onSubmit={handleCheckoutSubmit} className="contact-form" style={{ textAlign: 'center' }}>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', display: 'inline-block', marginBottom: '20px', border: '2px dashed #2ecc71' }}>
              {/* Actual QR Code Image */}
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" 
                alt="Scan to Pay via UPI" 
                style={{ width: '200px', height: '200px', objectFit: 'contain', display: 'block' }} 
              />
            </div>
            
            <h3 style={{ color: 'var(--text-heading)', marginBottom: '10px' }}>Scan to Pay</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Use Google Pay, PhonePe, Paytm, or any UPI app.</p>
            
            <div style={{ marginBottom: '25px', textAlign: 'left' }}>
              <label style={{ color: 'var(--text-main)', fontSize: '0.9em', fontWeight: 'bold' }}>12-Digit UTR / Transaction ID</label>
              <input type="text" value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 312345678901" required style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
              <p style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '5px' }}>Enter the reference number from your UPI app so we can verify the funds.</p>
            </div>
            
            <button type="submit" className="btn primary-btn" disabled={isProcessing} style={{ width: '100%', fontSize: '1.2em', padding: '15px', background: '#27ae60', color: 'white' }}>
              {isProcessing ? 'Connecting to Bank Gateway...' : 'Verify UPI Payment'}
            </button>
          </form>
          )}
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
            <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>July 22, 2026</span>
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
