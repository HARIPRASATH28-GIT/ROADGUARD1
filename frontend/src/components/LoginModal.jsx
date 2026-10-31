import React, { useState } from 'react';
import { X, Key, Shield, Radio, Wrench, Smartphone } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('officer');
  const [password, setPassword] = useState('officer123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickRoles = [
    { role: 'officer', name: 'Road Safety Officer', user: 'officer', pass: 'officer123', icon: Shield },
    { role: 'police', name: 'Traffic Police', user: 'police', pass: 'police123', icon: Radio },
    { role: 'maintenance', name: 'Road Maintenance', user: 'maintenance', pass: 'pwd123', icon: Wrench },
    { role: 'public', name: 'Public Citizen (No Login)', user: null, pass: null, icon: Smartphone }
  ];

  const handleSelectPreset = (preset) => {
    if (preset.role === 'public') {
      onLoginSuccess({
        role: 'public',
        username: 'citizen',
        full_name: 'Public Citizen (PWA Guest)'
      });
      onClose();
      return;
    }
    setUsername(preset.user);
    setPassword(preset.pass);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('roadguard_token', data.access_token);
        onLoginSuccess(data);
        onClose();
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Login failed');
      }
    } catch (err) {
      setError('Cannot connect to backend server on port 8000');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '28px',
        border: '1px solid var(--border-active)',
        boxShadow: 'var(--glow-cyan)'
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Role-Based Access</h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Select a demo profile or sign in with credentials
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Quick Role Selection Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          {quickRoles.map((qr) => {
            const Icon = qr.icon;
            const isSelected = username === qr.user;
            return (
              <button
                key={qr.role}
                type="button"
                onClick={() => handleSelectPreset(qr)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: isSelected ? '#38bdf8' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Icon size={16} />
                <span>{qr.name}</span>
              </button>
            );
          })}
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#090d16',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.85rem'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#090d16',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {error && (
            <div style={{ fontSize: '0.76rem', color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)', padding: '8px 10px', borderRadius: '6px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
          >
            <Key size={16} />
            <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
          </button>
        </form>

      </div>
    </div>
  );
}
