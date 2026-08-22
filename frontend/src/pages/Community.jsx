import React, { useState, useEffect } from 'react';

export default function Community({ API_BASE }) {
  const [feed, setFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFeed = async () => {
    try {
      const response = await fetch(`${API_BASE}/community_feed`);
      if (response.ok) {
        const data = await response.json();
        setFeed(data);
      } else {
        setError('Failed to load community feed.');
      }
    } catch (e) {
      setError('Could not connect to backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [API_BASE]);

  const handleCheer = async (postId) => {
    // Optimistic UI update
    setFeed(prevFeed => prevFeed.map(post => 
      post.id === postId ? { ...post, cheers_count: post.cheers_count + 1, hasCheered: true } : post
    ));

    try {
      await fetch(`${API_BASE}/cheer/${postId}`, {
        method: 'POST'
      });
    } catch (e) {
      console.error("Failed to cheer post", e);
    }
  };

  return (
    <div style={{ padding: '120px 20px 40px', minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ color: '#2ecc71', marginBottom: '10px', fontSize: '2.5em', textAlign: 'center' }}>Community Feed</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', textAlign: 'center' }}>
          Cheer on your fellow FitLife Hub members as they crush their goals! 🔥
        </p>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>Loading Feed...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#e74c3c' }}>{error}</div>
        ) : feed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '15px' }}>
            No activity yet. Be the first to log a healthy meal! 🥗
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {feed.map(post => (
              <div key={post.id} style={{ 
                background: 'var(--bg-card)', 
                padding: '25px', 
                borderRadius: '15px', 
                boxShadow: 'var(--shadow-main)', 
                border: '1px solid var(--border-color)',
                animation: 'fadeIn 0.5s ease-out'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                  {/* Avatar Placeholder */}
                  <div style={{ 
                    width: '45px', height: '45px', borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #2ecc71, #3498db)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    color: '#fff', fontWeight: 'bold', fontSize: '1.2em', marginRight: '15px'
                  }}>
                    {post.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1em', color: 'var(--text-main)' }}>{post.username}</h3>
                    <span style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                      {new Date(post.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                </div>
                
                <p style={{ fontSize: '1.1em', lineHeight: '1.5', margin: '0 0 20px 0', color: 'var(--text-main)' }}>
                  {post.description}
                </p>
                
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', display: 'flex', alignItems: 'center' }}>
                  <button 
                    onClick={() => !post.hasCheered && handleCheer(post.id)}
                    disabled={post.hasCheered}
                    style={{
                      background: post.hasCheered ? 'rgba(230, 126, 34, 0.2)' : 'transparent',
                      color: post.hasCheered ? '#e67e22' : 'var(--text-muted)',
                      border: `1px solid ${post.hasCheered ? '#e67e22' : 'var(--border-color)'}`,
                      padding: '8px 16px',
                      borderRadius: '20px',
                      cursor: post.hasCheered ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      fontWeight: 'bold',
                      transition: 'all 0.2s ease',
                      opacity: post.hasCheered ? 1 : 0.8
                    }}
                    onMouseOver={(e) => { if (!post.hasCheered) e.currentTarget.style.borderColor = '#e67e22'; }}
                    onMouseOut={(e) => { if (!post.hasCheered) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    🔥 Cheer
                  </button>
                  <span style={{ marginLeft: '15px', fontWeight: 'bold', color: post.cheers_count > 0 ? '#e67e22' : 'var(--text-muted)' }}>
                    {post.cheers_count} {post.cheers_count === 1 ? 'Cheer' : 'Cheers'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
