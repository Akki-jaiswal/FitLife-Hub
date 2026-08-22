import React, { useEffect } from 'react';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  return (
    <div style={{ padding: '120px 20px 40px', minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-card)', padding: '40px', borderRadius: '15px', boxShadow: 'var(--shadow-main)', border: '1px solid var(--border-color)' }}>
        <h1 style={{ color: '#2ecc71', marginBottom: '20px', fontSize: '2.5em', textAlign: 'center' }}>Privacy Policy</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', textAlign: 'center' }}>Effective Date: August 2026</p>

        <div style={{ lineHeight: '1.8' }}>
          <h3 style={{ color: '#3498db', marginTop: '20px' }}>1. Introduction</h3>
          <p>Welcome to FitLife Hub. Trustworthiness is our core principle, and we are committed to protecting your personal information. This Privacy Policy outlines how we collect, use, and protect your data.</p>

          <h3 style={{ color: '#3498db', marginTop: '20px' }}>2. Data Collection & Usage</h3>
          <p>Our policy is simple: we use scanned data (such as meal images or synced wearable metrics) solely to provide AI health insights to you. We do not sell your personal data to third parties.</p>

          <h3 style={{ color: '#3498db', marginTop: '20px' }}>3. Data Security</h3>
          <p>We implement industry-standard security measures to ensure that your health insights and personal tracking information remain confidential and secure within your account.</p>

          <h3 style={{ color: '#3498db', marginTop: '20px' }}>4. Your Rights</h3>
          <p>You have the right to access, modify, or delete your personal tracking data at any time by contacting our support team or managing your account settings.</p>

          <h3 style={{ color: '#3498db', marginTop: '20px' }}>5. Contact Us</h3>
          <p>If you have any questions about this Privacy Policy, please contact us via the support section on our homepage.</p>
        </div>
      </div>
    </div>
  );
}
