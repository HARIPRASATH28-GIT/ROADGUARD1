import React, { useState, useEffect } from 'react';
import { 
  Shield, AtSign, Lock, Eye, EyeOff, CheckCircle2, 
  MapPin, AlertCircle, ChevronDown, ChevronUp, ArrowRight,
  Info
} from 'lucide-react';

export default function LoginScreen({ onLoginSuccess, onContinueCitizen }) {
  const [activeTopTab, setActiveTopTab] = useState('agency'); // 'citizen' or 'agency'
  const [agencyMode, setAgencyMode] = useState('signin'); // 'signin' or 'create'
  
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoHintOpen, setDemoHintOpen] = useState(false);
  const [authConfig, setAuthConfig] = useState({ demo_mode: true, version: 'v1.4.2', demo_accounts: [] });

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/auth/config')
      .then(res => res.json())
      .then(data => setAuthConfig(data))
      .catch(err => console.log('Could not load auth config', err));
  }, []);

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!emailOrMobile.trim() || !password) {
      setErrorMsg('Invalid email or password');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailOrMobile.trim(),
          password: password,
          remember_me: rememberDevice
        })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('roadguard_token', data.access_token);
        localStorage.setItem('roadguard_user', JSON.stringify(data));
        onLoginSuccess(data);
      } else {
        const err = await res.json();
        // Strict Generic error per security spec: never reveal if user exists
        setErrorMsg(err.detail || 'Invalid email or password');
      }
    } catch (err) {
      setErrorMsg('Unable to connect to RoadGuard security server. Please ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (acc) => {
    setEmailOrMobile(acc.email);
    setPassword(acc.password_hint || 'hari');
    setErrorMsg('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'radial-gradient(circle at 50% 20%, #0d1933 0%, #070a12 70%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Background ambient glow circles */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '540px',
        height: '540px',
        background: 'radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Main Centered Authentication Card */}
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '36px 32px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 25px rgba(56, 189, 248, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative',
        zIndex: 10
      }}>

        {/* Shield Logo & Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            boxShadow: '0 0 20px rgba(56, 189, 248, 0.45)',
            marginBottom: '14px'
          }}>
            <Shield size={28} color="#ffffff" strokeWidth={2.2} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <h1 style={{
              fontSize: '1.65rem',
              fontWeight: 900,
              letterSpacing: '0.04em',
              color: '#ffffff',
              margin: 0
            }}>
              ROADGUARD
            </h1>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
              color: '#ffffff',
              padding: '2px 6px',
              borderRadius: '4px',
              letterSpacing: '0.05em'
            }}>
              AI
            </span>
          </div>

          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.82rem',
            marginTop: '5px',
            fontWeight: 500
          }}>
            Making Every Road Safer with Intelligence.
          </p>

          {/* Green Status Pill: AI Risk Engine Active */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '3px 10px', borderRadius: '20px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34d399', letterSpacing: '0.06em' }}>
              AI RISK ENGINE ACTIVE
            </span>
            <span style={{ fontSize: '0.65rem', color: '#6ee7b7', fontFamily: 'var(--font-mono)' }}>
              ({authConfig.version || 'v1.4.2'})
            </span>
          </div>

        </div>

        {/* Two Top Tabs: Citizen Access vs Agency Command */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: 'rgba(15, 23, 42, 0.8)',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '22px',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            type="button"
            onClick={() => { setActiveTopTab('citizen'); setErrorMsg(''); }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTopTab === 'citizen' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTopTab === 'citizen' ? '#38bdf8' : 'var(--text-muted)',
              fontWeight: activeTopTab === 'citizen' ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Citizen Access
          </button>

          <button
            type="button"
            onClick={() => { setActiveTopTab('agency'); setErrorMsg(''); }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTopTab === 'agency' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTopTab === 'agency' ? '#38bdf8' : 'var(--text-muted)',
              fontWeight: activeTopTab === 'agency' ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Agency Command
          </button>
        </div>

        {/* TAB 1: Citizen Access */}
        {activeTopTab === 'citizen' && (
          <div style={{ textAlign: 'center', padding: '10px 4px 6px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}>
              <MapPin size={22} color="#38bdf8" />
            </div>

            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '6px' }}>
              Public Safety Alerts &amp; Live Map
            </h3>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '20px' }}>
              Access officer-approved road hazard locations and receive on-device proximity warnings without creating an account.
            </p>

            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.74rem',
              color: '#a7f3d0',
              textAlign: 'left',
              marginBottom: '20px',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start'
            }}>
              <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Zero-Knowledge GPS:</strong> Your device coordinates are evaluated 100% locally and are <em>never sent to the server</em>.
              </div>
            </div>

            <button
              type="button"
              onClick={onContinueCitizen}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: '0.92rem' }}
            >
              <span>Continue to Map</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* TAB 2: Agency Command */}
        {activeTopTab === 'agency' && (
          <div>
            
            {/* Toggle: Sign In vs Create Account */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', marginBottom: '18px', fontSize: '0.82rem' }}>
              <button
                type="button"
                onClick={() => setAgencyMode('signin')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: agencyMode === 'signin' ? '#38bdf8' : 'var(--text-dim)',
                  fontWeight: agencyMode === 'signin' ? 700 : 500,
                  cursor: 'pointer',
                  borderBottom: agencyMode === 'signin' ? '2px solid #38bdf8' : '2px solid transparent',
                  paddingBottom: '4px'
                }}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => setAgencyMode('create')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: agencyMode === 'create' ? '#38bdf8' : 'var(--text-dim)',
                  fontWeight: agencyMode === 'create' ? 700 : 500,
                  cursor: 'pointer',
                  borderBottom: agencyMode === 'create' ? '2px solid #38bdf8' : '2px solid transparent',
                  paddingBottom: '4px'
                }}
              >
                Create Account
              </button>
            </div>

            {/* Create Account disabled note per specification */}
            {agencyMode === 'create' ? (
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                fontSize: '0.8rem',
                color: '#fde047',
                marginBottom: '14px'
              }}>
                <Info size={20} color="#fbbf24" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>Self-Registration Disabled</div>
                <div style={{ color: '#e2e8f0', fontSize: '0.78rem' }}>
                  Agency command accounts are issued directly by your department administrator.
                </div>
                <button
                  type="button"
                  onClick={() => setAgencyMode('signin')}
                  className="btn-ghost"
                  style={{ marginTop: '14px', fontSize: '0.76rem', width: '100%', justifyContent: 'center' }}
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              /* Sign In Form */
              <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Email / Mobile Field with @ icon */}
                <div>
                  <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                    Email or Mobile Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>
                      <AtSign size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. officer@roadguard.gov.in"
                      value={emailOrMobile}
                      onChange={(e) => setEmailOrMobile(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px 11px 38px',
                        background: '#090d16',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.85rem',
                        outline: 'none',
                        transition: 'border-color 0.15s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.07)'}
                    />
                  </div>
                </div>

                {/* Password Field with lock & show/hide eye & Forgot? link */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Access Key / Password
                    </label>
                    <a 
                      href="#forgot" 
                      onClick={(e) => { e.preventDefault(); alert("Please contact your command administrator to reset your agency access key."); }}
                      style={{ fontSize: '0.72rem', color: '#38bdf8', textDecoration: 'none' }}
                    >
                      Forgot?
                    </a>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 38px 11px 38px',
                        background: '#090d16',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.85rem',
                        outline: 'none',
                        transition: 'border-color 0.15s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.07)'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember My Device Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
                    />
                    <span>Remember my device</span>
                  </label>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div style={{
                    background: 'rgba(244, 63, 94, 0.12)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: '#fb7185',
                    fontSize: '0.76rem',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Primary Gradient Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '12px 18px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    marginTop: '4px'
                  }}
                >
                  <Lock size={16} />
                  <span>{loading ? 'Authenticating...' : 'Sign In to RoadGuard'}</span>
                </button>

                {/* Divider: OR VERIFY WITH */}
                <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0 6px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', padding: '0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    OR VERIFY WITH
                  </span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
                </div>

                {/* Continue with Google ID (Disabled / Coming Soon as specified) */}
                <button
                  type="button"
                  onClick={() => alert("Google ID single sign-on is restricted to enterprise agency domains. (Coming soon)")}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'not-allowed',
                    opacity: 0.75
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z" />
                    <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17C3.7 20.7 7.5 23.5 12 23.5z" />
                  </svg>
                  <span>Continue with Google ID</span>
                  <span style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '4px' }}>
                    Coming soon
                  </span>
                </button>

                {/* Collapsible Demo Accounts Hint (Only shown when DEMO_MODE is true) */}
                {authConfig.demo_mode && (
                  <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setDemoHintOpen(!demoHintOpen)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-dim)',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '4px 0'
                      }}
                    >
                      <span>💡 Demo accounts (1-click autofill)</span>
                      {demoHintOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {demoHintOpen && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                        {(authConfig.demo_accounts || [
                          { email: 'hariprasathsTP@gmail.com', role: 'traffic_police', password_hint: 'hari', department: 'Traffic Police' },
                          { email: 'hariprasathsRS@gmail.com', role: 'road_safety_officer', password_hint: 'hari', department: 'Safety Authority' },
                          { email: 'hariprasathsRM@gmail.com', role: 'road_maintenance', password_hint: 'hari', department: 'Road Maintenance' }
                        ]).map((acc) => (
                          <button
                            key={acc.email}
                            type="button"
                            onClick={() => handleQuickFill(acc)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.72rem', color: '#f8fafc', fontWeight: 600 }}>
                                {acc.email}
                              </div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                                Role: <strong>{acc.role}</strong> &bull; Key: <code>{acc.password_hint || 'hari'}</code>
                              </div>
                            </div>
                            <span style={{ fontSize: '0.65rem', color: '#38bdf8' }}>Fill &rarr;</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </form>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
