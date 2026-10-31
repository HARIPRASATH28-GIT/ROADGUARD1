import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import OfficerConsole from './components/OfficerConsole';
import TrafficPoliceConsole from './components/TrafficPoliceConsole';
import MaintenanceConsole from './components/MaintenanceConsole';
import PublicAlertApp from './components/PublicAlertApp';
import EvaluationDashboard from './components/EvaluationDashboard';
import LoginScreen from './components/LoginScreen';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('officer');
  const [hotspots, setHotspots] = useState([]);
  const [roadSegments, setRoadSegments] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage if remembered
  useEffect(() => {
    const savedUser = localStorage.getItem('roadguard_user');
    const savedToken = localStorage.getItem('roadguard_token');
    if (savedUser && savedToken) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        // Land on matching role dashboard
        if (parsed.role === 'traffic_police') setActiveTab('police');
        else if (parsed.role === 'road_safety_officer') setActiveTab('officer');
        else if (parsed.role === 'road_maintenance') setActiveTab('maintenance');
        else setActiveTab('public');
      } catch (e) {
        localStorage.removeItem('roadguard_user');
        localStorage.removeItem('roadguard_token');
      }
    }
    setLoading(false);
  }, []);

  // Fetch hotspots, road segments, and incidents
  useEffect(() => {
    fetchRoadSegments();
    fetchIncidents();
    if (currentUser?.role === 'road_safety_officer' || currentUser?.role === 'officer' || currentUser?.role === 'admin') {
      fetchHotspots();
    }
  }, [currentUser]);

  const fetchRoadSegments = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/incidents/road-segments/corridors');
      if (res.ok) setRoadSegments(await res.json());
    } catch (e) {
      console.warn("Could not load road segments", e);
    }
  };

  const fetchIncidents = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/incidents');
      if (res.ok) setIncidents(await res.json());
    } catch (e) {
      console.warn("Could not load incidents", e);
    }
  };

  const fetchHotspots = async () => {
    const token = localStorage.getItem('roadguard_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      const res = await fetch('http://localhost:8000/api/v1/risk/hotspots', { headers });
      if (res.ok) {
        const data = await res.json();
        setHotspots(data);
        if (data.length > 0 && !selectedHotspotId) {
          setSelectedHotspotId(data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load hotspots from backend", e);
    }
  };

  const handleApproveHotspot = async (hotspotId) => {
    const token = localStorage.getItem('roadguard_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`http://localhost:8000/api/v1/risk/hotspots/${hotspotId}/approval`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status: 'APPROVED' })
      });
      if (res.ok) {
        await fetchHotspots();
      }
    } catch (e) {
      console.error("Approval failed", e);
    }
  };

  const handleRejectHotspot = async (hotspotId, reason) => {
    const token = localStorage.getItem('roadguard_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`http://localhost:8000/api/v1/risk/hotspots/${hotspotId}/approval`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status: 'REJECTED', rejection_reason: reason })
      });
      if (res.ok) {
        await fetchHotspots();
      }
    } catch (e) {
      console.error("Rejection failed", e);
    }
  };

  // Sign out handler
  const handleLogout = async () => {
    const token = localStorage.getItem('roadguard_token');
    if (token) {
      try {
        await fetch('http://localhost:8000/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {
        console.warn('Logout notification error', e);
      }
    }
    localStorage.removeItem('roadguard_token');
    localStorage.removeItem('roadguard_user');
    setCurrentUser(null);
  };

  // Handle successful login
  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    // Redirect to matching role dashboard as specified
    if (userData.role === 'traffic_police') {
      setActiveTab('police');
    } else if (userData.role === 'road_safety_officer') {
      setActiveTab('officer');
    } else if (userData.role === 'road_maintenance') {
      setActiveTab('maintenance');
    } else {
      setActiveTab('public');
    }
  };

  // Citizen guest entry (No account needed, zero GPS tracking)
  const handleContinueCitizen = () => {
    const guestUser = {
      role: 'public',
      email: 'citizen@roadguard.local',
      full_name: 'Public Citizen (Guest)'
    };
    setCurrentUser(guestUser);
    setActiveTab('public');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070a12', color: '#94a3b8' }}>
        Loading RoadGuard AI...
      </div>
    );
  }

  // If no user session is active, display the styled Login Screen
  if (!currentUser) {
    return (
      <LoginScreen 
        onLoginSuccess={handleLoginSuccess}
        onContinueCitizen={handleContinueCitizen}
      />
    );
  }

  const selectedHotspot = hotspots.find(h => h.id === selectedHotspotId) || hotspots[0];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Universal Navbar with Role Filtering & Sign Out */}
      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenLogin={() => setCurrentUser(null)}
      />

      {/* Main Dynamic Workspace Views */}
      <main style={{ flex: 1 }}>
        {activeTab === 'officer' && (
          <OfficerConsole 
            hotspots={hotspots}
            roadSegments={roadSegments}
            incidents={incidents}
            selectedHotspot={selectedHotspot}
            onSelectHotspot={setSelectedHotspotId}
            onApproveHotspot={handleApproveHotspot}
            onRejectHotspot={handleRejectHotspot}
          />
        )}

        {activeTab === 'police' && (
          <TrafficPoliceConsole 
            hotspots={hotspots}
            roadSegments={roadSegments}
            incidents={incidents}
          />
        )}

        {activeTab === 'maintenance' && (
          <MaintenanceConsole 
            hotspots={hotspots}
            roadSegments={roadSegments}
            incidents={incidents}
          />
        )}

        {activeTab === 'public' && (
          <PublicAlertApp />
        )}

        {activeTab === 'metrics' && (
          <EvaluationDashboard />
        )}
      </main>

      {/* Footer */}
      <footer style={{ 
        borderTop: '1px solid var(--border-subtle)', 
        padding: '16px 24px', 
        textAlign: 'center', 
        fontSize: '0.74rem', 
        color: 'var(--text-dim)',
        background: 'rgba(7, 10, 18, 0.95)'
      }}>
        RoadGuard AI &bull; Built with FastAPI, XGBoost, TreeSHAP, OpenCV &amp; React &bull; Strict Zero-Surveillance Guardrails Enforced
      </footer>
    </div>
  );
}
