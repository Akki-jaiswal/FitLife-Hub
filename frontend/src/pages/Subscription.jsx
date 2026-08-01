import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Subscription = ({ userTier, handleUpgrade, handleContactSubmit, loggedInUser }) => {
  const navigate = useNavigate();

  // Scroll to top on mount so it doesn't load scrolled down
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="subscription-page" style={{ paddingTop: '100px', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '60px' }}>
      <button 
        onClick={() => navigate('/')} 
        style={{ alignSelf: 'flex-start', margin: '0 0 20px 5%', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer' }}>
        &larr; Back to Dashboard
      </button>

      {/* HERO SECTION */}
      <h2 className="pricing-title" style={{ fontSize: '3.5em', marginTop: '20px' }}>Unlock Your True Potential</h2>
      <p className="pricing-subtitle" style={{ fontSize: '1.2em', maxWidth: '600px', margin: '0 auto 50px auto', lineHeight: '1.6' }}>
        You've experienced the power of AI fitness tracking. Upgrade to FitLife Pro to remove all limits, access deep strategic analytics, and accelerate your results.
      </p>
      
      {/* PRICING CARDS */}
      <div className="pricing-cards-container" style={{ maxWidth: '1000px', width: '90%' }}>
        <div className="pricing-card free-tier card-3d">
          <h3>FitLife Basic</h3>
          <div className="price">Free</div>
          <ul className="features-list">
            <li>✓ Manual Workout Logging</li>
            <li>✓ Basic Chatbot Access</li>
            <li>✓ Dark & Light Modes</li>
            <li className="locked">✗ Limit: 7 AI Meal Scans / week</li>
            <li className="locked">✗ Limit: 7 PDF Reports / week</li>
          </ul>
          <button className="btn secondary-btn" disabled style={{ color: "var(--text-main)", borderColor: "var(--border-color)", opacity: 0.7 }}>Current Plan</button>
        </div>

        <div className="pricing-card pro-tier card-3d glow-effect" style={{ transform: 'scale(1.05)' }}>
          <div className="popular-badge" style={{ fontSize: '1em', padding: '8px 20px' }}>FitLife Pro</div>
          <h3 style={{ marginTop: '10px' }}>Unlimited AI Access</h3>
          <div className="price">$9<span>/mo</span></div>
          <ul className="features-list">
            <li>✓ Everything in Basic</li>
            <li>✓ Unlimited AI Chatbot</li>
            <li>✓ Unlimited AI Meal Image Scanner</li>
            <li>✓ Unlimited Strategic PDF Reports</li>
            <li>✓ Priority Support & Premium Analytics</li>
          </ul>
          {userTier === 'Pro' ? (
            <button className="btn secondary-btn upgrade-btn" disabled style={{ background: '#27ae60', color: 'white', opacity: 1 }}>You are a Pro Member</button>
          ) : !loggedInUser ? (
            <button className="btn primary-btn upgrade-btn" onClick={() => { alert('Please create a Free account or Login first before upgrading!'); navigate('/'); }} style={{ padding: '20px', fontSize: '1.2em' }}>
              Create Account to Upgrade
            </button>
          ) : (
            <button className="btn primary-btn upgrade-btn" onClick={() => navigate('/checkout')} style={{ padding: '20px', fontSize: '1.2em' }}>
              Upgrade to Pro Instantly
            </button>
          )}
        </div>
      </div>

      {/* DETAILED FEATURE COMPARISON */}
      <h2 className="sub-section-title">Compare Features</h2>
      <div className="table-responsive-wrapper">
        <table className="comparison-table" style={{ border: '1px solid var(--border-color)', boxShadow: '0 15px 35px rgba(0,0,0,0.05)' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '2px solid var(--border-color)' }}>Why Upgrade?</th>
              <th style={{ borderBottom: '2px solid var(--border-color)' }}>FitLife Basic</th>
              <th style={{ borderBottom: '2px solid #2ecc71', background: 'rgba(46, 204, 113, 0.1)' }}>FitLife Pro <span style={{fontSize: '0.8em'}}>($9/mo)</span></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>📸 Unlimited Meal Image Scanning</strong><br/>
                <span style={{fontSize: '0.85em', color: 'var(--text-muted)'}}>Instantly log macros, calories, and nutritional breakdown from any photo.</span>
              </td>
              <td>7 Scans / Week</td>
              <td className="pro-check" style={{ background: 'rgba(46, 204, 113, 0.05)' }}>Unlimited</td>
            </tr>
            <tr>
              <td>
                <strong>📊 Deep-Dive Predictive Analytics</strong><br/>
                <span style={{fontSize: '0.85em', color: 'var(--text-muted)'}}>Generate strategic PDF reports analyzing your calorie deficits and predicting weight trends.</span>
              </td>
              <td>7 Reports / Week</td>
              <td className="pro-check" style={{ background: 'rgba(46, 204, 113, 0.05)' }}>Unlimited + PDF Exports</td>
            </tr>
            <tr>
              <td>
                <strong>🤖 Priority AI Coach Access</strong><br/>
                <span style={{fontSize: '0.85em', color: 'var(--text-muted)'}}>Zero wait times, enhanced contextual memory, and tailored workout routines.</span>
              </td>
              <td>Standard Access</td>
              <td className="pro-check" style={{ background: 'rgba(46, 204, 113, 0.05)' }}>Priority Access</td>
            </tr>
            <tr>
              <td>
                <strong>⌚ Seamless Smartwatch Sync</strong><br/>
                <span style={{fontSize: '0.85em', color: 'var(--text-muted)'}}>Automatically pull in steps and burned calories.</span>
              </td>
              <td>Included</td>
              <td className="pro-check" style={{ background: 'rgba(46, 204, 113, 0.05)' }}>Included</td>
            </tr>
            <tr>
              <td>
                <strong>💎 Premium Ad-Free Interface</strong><br/>
                <span style={{fontSize: '0.85em', color: 'var(--text-muted)'}}>Experience FitLife in a completely distraction-free, 3D environment.</span>
              </td>
              <td className="basic-cross">Ads May Appear</td>
              <td className="pro-check" style={{ background: 'rgba(46, 204, 113, 0.05)' }}>100% Ad-Free</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* PRO TESTIMONIALS */}
      <h2 className="sub-section-title">Why Users Upgrade</h2>
      <div className="testimonial-grid" style={{ maxWidth: '1000px', width: '90%' }}>
        <div className="testimonial-card card-3d">
          <p>"The unlimited AI Meal Scanner is a game changer. I just snap a photo of my plate and it instantly logs my macros. Best $9 I spend every month."</p>
          <span className="testimonial-author" style={{ color: '#2ecc71', fontWeight: 'bold' }}>- Emily R., Pro Member</span>
        </div>
        <div className="testimonial-card card-3d">
          <p>"The weekly Strategic PDF Reports give me deep insights into my calorie deficits and weight trends. It's like having a personal data scientist."</p>
          <span className="testimonial-author" style={{ color: '#2ecc71', fontWeight: 'bold' }}>- James T., Pro Member</span>
        </div>
      </div>

      {/* MONEY BACK GUARANTEE */}
      <div className="trust-badge">
        <span style={{ fontSize: '2em' }}>🛡️</span>
        <div>
          <h3 style={{ margin: '0', fontSize: '1.2em' }}>14-Day Money-Back Guarantee</h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: 'var(--text-muted)' }}>Not satisfied? Get a full refund, no questions asked.</p>
        </div>
      </div>


      {/* RESTORED: Contact Section */}
      <section id="contact" className="contact-section" style={{ marginTop: '60px', background: 'var(--bg-tertiary)', padding: '60px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.5em', color: 'var(--text-heading)', marginBottom: '20px' }}>Get In Touch</h2>
        <p style={{ color: 'var(--text-main)', marginBottom: '40px', fontSize: '1.1em' }}>Have questions about FitLife Pro? We're here to help! 😃</p>
        <form className="contact-form" onSubmit={handleContactSubmit} style={{ maxWidth: '600px', margin: '0 auto' }}>
          <input type="text" placeholder="Your Name" name="name" required />
          <input type="email" placeholder="Your Email" name="email" required />
          <textarea placeholder="Your Message" name="message" required></textarea>
          <button type="submit" className="btn primary-btn" style={{ width: '100%' }}>Send Message</button>
        </form>
      </section>
    </div>
  );

};

export default Subscription;
