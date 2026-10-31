import React from 'react';
import { Shield, Radio, Wrench, Smartphone, BarChart3, LogOut, LogIn } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentUser, onLogout, onOpenLogin }) {
  // Strict role-based navigation filtering:
  // Each role only sees its authorized tab + public evaluation
  const allNavItems = [
    { id: 'officer', label: 'Safety Officer Console', icon: Shield, badge: 'Main Console', roles: ['road_safety_officer', 'officer', 'admin'] },
    { id: 'police', label: 'Traffic Police', icon: Radio, badge: 'Optimization', roles: ['traffic_police', 'police', 'admin'] },
    { id: 'maintenance', label: 'Road Maintenance', icon: Wrench, badge: 'Work Orders', roles: ['road_maintenance', 'maintenance', 'admin'] },
    { id: 'public', label: 'Public Safety PWA', icon: Smartphone, badge: 'Zero-GPS', roles: ['public', 'citizen', 'admin'] },
    { id: 'metrics', label: 'Evaluation & AI Ethics', icon: BarChart3, badge: 'Metrics', roles: ['road_safety_officer', 'traffic_police', 'road_maintenance', 'public', 'admin'] }
  ];

  const userRole = currentUser?.role || 'public';
  const visibleNavItems = allNavItems.filter(item => item.roles.includes(userRole));

  const roleDisplayNames = {
    'traffic_police': 'Traffic Police',
    'road_safety_officer': 'Road Safety Officer',
    'road_maintenance': 'Road Maintenance',
    'public': 'Public Citizen'
  };

  return (
    <header className="glass-nav sticky top-0 z-50 px-4 py-3">
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Brand & Guardrail Notice */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            width: '38px', 
            height: '38px', 
            borderRadius: '10px', 
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(56, 189, 248, 0.4)'
          }}>
            <Shield size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #f8fafc, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                RoadGuard AI
              </span>
              <span className="badge badge-demo">
                DEMO / SYNTHETIC
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Moving Road Safety from Reactive to Preventive &bull; IRC &amp; FHWA Grounded
            </div>
          </div>
        </div>

        {/* Role Navigation Tabs (Restricted to Authorized Dashboards Only) */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                  color: isActive ? '#38bdf8' : 'var(--text-muted)',
                  borderRadius: '10px',
                  padding: '7px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.82rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.badge && (
                  <span style={{ 
                    fontSize: '0.65rem', 
                    padding: '1px 5px', 
                    borderRadius: '4px',
                    background: isActive ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    color: isActive ? '#bae6fd' : '#94a3b8'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Status & Sign Out Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '5px 10px',
            fontSize: '0.78rem'
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: userRole === 'public' ? '#38bdf8' : '#10b981', boxShadow: `0 0 8px ${userRole === 'public' ? '#38bdf8' : '#10b981'}` }} />
            <span style={{ color: 'var(--text-muted)' }}>Role:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
              {roleDisplayNames[userRole] || userRole}
            </span>
          </div>

          {userRole !== 'public' ? (
            <button
              onClick={onLogout}
              className="btn-ghost"
              style={{ fontSize: '0.78rem', padding: '6px 12px', color: '#fca5a5', border: '1px solid rgba(244, 63, 94, 0.3)' }}
              title="Sign out of agency command"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={onOpenLogin}
              className="btn-primary"
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              <LogIn size={14} />
              <span>Agency Login</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
