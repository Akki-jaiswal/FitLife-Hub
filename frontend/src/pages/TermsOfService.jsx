import React, { useEffect } from 'react';

export default function TermsOfService() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  return (
    <div style={{ padding: '120px 20px 40px', minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-card)', padding: '40px', borderRadius: '15px', boxShadow: 'var(--shadow-main)', border: '1px solid var(--border-color)' }}>
        <h1 style={{ color: '#2ecc71', marginBottom: '20px', fontSize: '2.5em', textAlign: 'center' }}>Terms of Service</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', textAlign: 'center' }}>Effective Date: August 2026</p>

        <div style={{ lineHeight: '1.8' }}>
          <h3 style={{ color: '#3498db', marginTop: '20px' }}>1. Acceptance of Terms</h3>
          <p>By accessing and using FitLife Hub, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our platform.</p>

          <h3 style={{ color: '#3498db', marginTop: '20px' }}>2. Subscription and Payments</h3>
          <p>We offer both Free and Premium subscription tiers. Premium features such as the AI Workout Generator require a paid subscription. All payments are securely processed.</p>

          <h3 style={{ color: '#3498db', marginTop: '20px' }}>3. Refund Policy</h3>
          <p>We strive for complete customer satisfaction. If you are unsatisfied with your Premium subscription, we can provide a refund based on specific communication with our support team. Please note that the team will not process refunds immediately ("as early as possible"), as every case requires review. Please be patient while we process your request.</p>

          <h3 style={{ color: '#3498db', marginTop: '20px' }}>4. Usage Guidelines</h3>
          <p>Our AI insights and workout plans are generated based on the data you provide. They are intended for motivational and informational purposes and should not be taken as professional medical advice.</p>

          <h3 style={{ color: '#3498db', marginTop: '20px' }}>5. Intellectual Property</h3>
          <p>© 2026 FitLife Hub. All rights reserved. The content, layout, design, and graphics on this website are protected by intellectual property laws.</p>
        </div>
      </div>
    </div>
  );
}
