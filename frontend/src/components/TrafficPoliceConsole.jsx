import React, { useState, useEffect } from 'react';
import { 
  Radio, Clock, AlertTriangle, ArrowRight, CheckCircle2, 
  XCircle, School, Building2, Flame, Sliders, Zap
} from 'lucide-react';
import LeafletMap from './LeafletMap';
import IncidentIntelligencePanel from './IncidentIntelligencePanel';

export default function TrafficPoliceConsole({ 
  hotspots,
  roadSegments = [],
  incidents = []
}) {
  const [activeViewMode, setActiveViewMode] = useState('traffic'); // 'traffic' or 'video_incidents'
  const [congestionPoints, setCongestionPoints] = useState([]);
  const [vulnerableZones, setVulnerableZones] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [filterLayer, setFilterLayer] = useState('ALL'); // ALL, SCHOOLS, HOSPITALS
  const [loading, setLoading] = useState(true);

  // Fetch traffic police specific data from backend
  useEffect(() => {
    async function fetchTrafficData() {
      const token = localStorage.getItem('roadguard_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      try {
        const [cRes, vRes, sRes] = await Promise.all([
          fetch('http://localhost:8000/api/v1/traffic/congestion-map', { headers }),
          fetch('http://localhost:8000/api/v1/traffic/vulnerable-zones', { headers }),
          fetch('http://localhost:8000/api/v1/traffic/optimization-suggestions', { headers })
        ]);
        if (cRes.ok) setCongestionPoints(await cRes.json());
        if (vRes.ok) setVulnerableZones(await vRes.json());
        if (sRes.ok) setSuggestions(await sRes.json());
      } catch (e) {
        console.error("Traffic data fetch error", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTrafficData();
  }, []);

  const handleRespondSuggestion = async (suggestionId, action) => {
    const token = localStorage.getItem('roadguard_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      await fetch(`http://localhost:8000/api/v1/traffic/respond-suggestion?suggestion_id=${suggestionId}&action=${action}`, {
        method: 'POST',
        headers
      });
      // Update UI state
      setSuggestions(prev => prev.filter(s => s.suggestion_id !== suggestionId));
    } catch (e) {
      console.error("Failed to respond to suggestion", e);
    }
  };

  const filteredZones = vulnerableZones.filter(z => {
    if (filterLayer === 'SCHOOLS') return z.type === 'SCHOOL_ZONE';
    if (filterLayer === 'HOSPITALS') return z.type === 'HOSPITAL_CORRIDOR';
    return true;
  });

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Console Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              Traffic Police Operations Console
            </h1>
            <span className="badge badge-cyan">Tactical Flow Optimization</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Live corridor congestion &bull; School/hospital bell-window protection &bull; Dynamic signal &amp; staff dispatch
          </p>
        </div>

        {/* Guardrail Affirmation Banner */}
        <div style={{ 
          background: 'rgba(56, 189, 248, 0.08)', 
          border: '1px solid rgba(56, 189, 248, 0.25)', 
          padding: '8px 14px', 
          borderRadius: '8px',
          fontSize: '0.78rem',
          color: '#bae6fd'
        }}>
          🛡️ <strong>Guardrail Active:</strong> Aggregates only. Identity surveillance &amp; individual vehicle tracking strictly prohibited.
        </div>
      </div>

      {/* Sub-view Navigation Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(15, 23, 42, 0.6)', padding: '6px', borderRadius: '10px', border: '1px solid rgba(51, 65, 85, 0.6)', width: 'fit-content' }}>
        <button
          onClick={() => setActiveViewMode('traffic')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: activeViewMode === 'traffic' ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'transparent',
            color: activeViewMode === 'traffic' ? '#ffffff' : '#94a3b8',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Traffic Congestion &amp; Tactical Dispatch
        </button>
        <button
          onClick={() => setActiveViewMode('video_incidents')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: activeViewMode === 'video_incidents' ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'transparent',
            color: activeViewMode === 'video_incidents' ? '#ffffff' : '#94a3b8',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Video Damage &amp; Incident Intelligence (AI Vision)
        </button>
      </div>

      {activeViewMode === 'video_incidents' ? (
        <IncidentIntelligencePanel 
          currentRole="traffic_police"
          onOpenMapLocation={() => setActiveViewMode('traffic')}
        />
      ) : (
        /* Main Grid: Left Traffic Map + Layers; Right: Tactical Suggestions Queue */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        
        {/* Left Column: Congestion Map & Vulnerable Zones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={18} color="#38bdf8" />
                <span>Live Arterial Flow &amp; Congestion Layer</span>
              </div>

              {/* Layer Toggles */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {['ALL', 'SCHOOLS', 'HOSPITALS'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilterLayer(tab)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      background: filterLayer === tab ? '#38bdf8' : 'rgba(255, 255, 255, 0.05)',
                      color: filterLayer === tab ? '#090d16' : 'var(--text-muted)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <LeafletMap 
              hotspots={hotspots}
              roadSegments={roadSegments}
              incidents={incidents}
              showCorridors={true}
              showIncidents={true}
              height="380px"
            />
          </div>

          {/* School & Hospital Vulnerable Zone Layers */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#f59e0b" />
              <span>Vulnerable Zones &amp; Risky Time Windows</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {filteredZones.map((zone, idx) => {
                const isSchool = zone.type === 'SCHOOL_ZONE';
                return (
                  <div key={idx} style={{ 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    border: isSchool ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '12px', 
                    borderRadius: '10px' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      {isSchool ? <School size={16} color="#f59e0b" /> : <Building2 size={16} color="#38bdf8" />}
                      <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>{zone.name}</span>
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
                      Proximity: {zone.distance_m}m to junction approach
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <strong>Active Windows:</strong>
                      <ul style={{ paddingLeft: '14px', marginTop: '3px' }}>
                        {zone.risky_time_windows.map((w, wIdx) => (
                          <li key={wIdx} style={{ color: isSchool ? '#fde68a' : '#bae6fd' }}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Tactical Suggestions Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={18} color="#38bdf8" />
                  <span>Tactical Optimization Suggestions</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Algorithmic dispatch recommendations based on real-time queue lengths and bell peaks
                </div>
              </div>
              <span className="badge badge-cyan">{suggestions.length} Pending</span>
            </div>

            {suggestions.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
                No active traffic bottlenecks requiring intervention. Corridor flows are nominal.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {suggestions.map((sug) => (
                  <div key={sug.suggestion_id} style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                          {sug.junction_name} &bull; {sug.suggestion_id}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#f8fafc', marginTop: '2px' }}>
                          {sug.action}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>
                          -{sug.estimated_delay_reduction_pct}%
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Delay Reduction</div>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      {sug.reason}
                    </p>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleRespondSuggestion(sug.suggestion_id, 'ACCEPT')}
                        className="btn-success"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <CheckCircle2 size={15} />
                        <span>Accept &amp; Deploy</span>
                      </button>

                      <button
                        onClick={() => handleRespondSuggestion(sug.suggestion_id, 'REJECT')}
                        className="btn-ghost"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <XCircle size={15} />
                        <span>Decline</span>
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Flow Summary Statistics */}
          <div className="glass-panel" style={{ padding: '18px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '12px' }}>
              Network Flow Health Aggregate
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>AVERAGE NETWORK SPEED</div>
                <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                  46.2 km/h
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>TOTAL BOTTLENECK QUEUES</div>
                <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                  2 Critical
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    )}

    </div>
  );
}
