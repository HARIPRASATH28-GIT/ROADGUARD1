import React, { useState, useEffect } from 'react';
import { 
  Wrench, AlertOctagon, CheckCircle2, Clock, 
  ExternalLink, Sparkles, RefreshCw, Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import LeafletMap from './LeafletMap';
import IncidentIntelligencePanel from './IncidentIntelligencePanel';

export default function MaintenanceConsole({ 
  hotspots,
  roadSegments = [],
  incidents = []
}) {
  const [activeViewMode, setActiveViewMode] = useState('maintenance'); // 'maintenance' or 'video_incidents'
  const [damages, setDamages] = useState([]);
  const [selectedDamage, setSelectedDamage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rescanningId, setRescanningId] = useState(null);

  useEffect(() => {
    fetchDamages();
  }, []);

  const fetchDamages = async () => {
    const token = localStorage.getItem('roadguard_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      const res = await fetch('http://localhost:8000/api/v1/maintenance/damages', { headers });
      if (res.ok) {
        const data = await res.json();
        setDamages(data);
        if (data.length > 0 && !selectedDamage) {
          setSelectedDamage(data[0]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch damages", e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (damageId, newStatus) => {
    const token = localStorage.getItem('roadguard_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/maintenance/damages/${damageId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ work_order_status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setDamages(prev => prev.map(d => d.id === damageId ? updated : d));
        if (selectedDamage?.id === damageId) {
          setSelectedDamage(updated);
        }
      }
    } catch (e) {
      console.error("Failed to update work order", e);
    }
  };

  const handleTriggerRescan = async (damageId) => {
    setRescanningId(damageId);
    const token = localStorage.getItem('roadguard_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      const res = await fetch(`http://localhost:8000/api/v1/maintenance/damages/${damageId}/rescan`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        const rescanResult = await res.json();
        confetti({
          particleCount: 50,
          spread: 50,
          origin: { y: 0.6 }
        });
        await fetchDamages();
      }
    } catch (e) {
      console.error("Failed to run rescan verification", e);
    } finally {
      setRescanningId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Console Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              Road Maintenance &amp; Work Orders
            </h1>
            <span className="badge badge-demo">RDD2022 Schema</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Automated road damage detector (YOLOv8) &bull; Priority repair queue &bull; Municipal authority work-order dispatch
          </p>
        </div>

        <div style={{ 
          background: 'rgba(234, 179, 8, 0.1)', 
          border: '1px solid rgba(234, 179, 8, 0.3)', 
          padding: '8px 14px', 
          borderRadius: '8px',
          fontSize: '0.78rem',
          color: '#fef08a'
        }}>
          🔧 <strong>Workflow Pattern:</strong> pothole-reporter dispatch &bull; RDD2022 severity grading (D00-D40)
        </div>
      </div>

      {/* Sub-view Navigation Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(15, 23, 42, 0.6)', padding: '6px', borderRadius: '10px', border: '1px solid rgba(51, 65, 85, 0.6)', width: 'fit-content' }}>
        <button
          onClick={() => setActiveViewMode('maintenance')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: activeViewMode === 'maintenance' ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'transparent',
            color: activeViewMode === 'maintenance' ? '#ffffff' : '#94a3b8',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Pavement Defect Queue &amp; Work Orders
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
          currentRole="road_maintenance"
          onOpenMapLocation={() => setActiveViewMode('maintenance')}
        />
      ) : (
        /* Main Grid: Left Damage Queue & Details; Right: Map & Work Orders */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        
        {/* Left Column: Prioritized Damage Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertOctagon size={18} color="#eab308" />
                <span>Priority Damage Queue (Ranked by Risk)</span>
              </div>
              <span className="badge badge-cyan">{damages.length} Detected Defects</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {damages.map((dmg) => {
                const isSelected = selectedDamage?.id === dmg.id;
                const isVerified = dmg.work_order_status === 'VERIFIED';
                return (
                  <div
                    key={dmg.id}
                    onClick={() => setSelectedDamage(dmg)}
                    style={{
                      background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            background: dmg.severity >= 3 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                            color: dmg.severity >= 3 ? '#fb7185' : '#fde047',
                            fontWeight: 700 
                          }}>
                            SEV {dmg.severity} / 4
                          </span>
                          <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                            {dmg.id}
                          </span>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#f8fafc', marginTop: '4px' }}>
                          {dmg.damage_type}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {dmg.hotspot_name}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8' }}>
                          {dmg.priority_score}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Priority Score</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-dim)' }}>
                        Status: <strong style={{ color: isVerified ? '#34d399' : '#bae6fd' }}>{dmg.work_order_status}</strong>
                      </span>
                      <span style={{ color: 'var(--text-dim)' }}>
                        {dmg.responsible_body.split(' ')[0]}
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Work Order Dispatch & Re-scan Verification */}
        {selectedDamage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Defect Inspection Card with SVG Visualizer */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                    Inspection &bull; {selectedDamage.id}
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                    {selectedDamage.damage_type}
                  </h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {selectedDamage.hotspot_name}
                  </div>
                </div>

                <span className="badge badge-approved">
                  {selectedDamage.work_order_status}
                </span>
              </div>

              {/* Synthetic Road Damage Visualizer (Photo Thumbnail) */}
              <div style={{ 
                width: '100%', 
                height: '160px', 
                background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', 
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: '16px'
              }}>
                {/* Asphalt texture simulation */}
                <div style={{ position: 'absolute', inset: 0, opacity: 0.15, background: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '8px 8px' }} />
                
                {/* Crack / Pothole SVG simulation */}
                <svg width="220" height="120" viewBox="0 0 220 120">
                  <ellipse cx="110" cy="60" rx={selectedDamage.damage_width_cm ? selectedDamage.damage_width_cm * 1.5 : 45} ry="28" fill="#090d16" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="4,2" />
                  <path d="M70,55 Q95,45 110,65 T150,58" fill="none" stroke="#fbbf24" strokeWidth="3" />
                  <text x="110" y="65" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                    {selectedDamage.damage_code} ({selectedDamage.damage_depth_cm || 5}cm depth)
                  </text>
                </svg>

                <div style={{ position: 'absolute', bottom: '8px', left: '10px', fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px' }}>
                  YOLOv8 RDD2022 Detection Thumbnail
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5, marginBottom: '14px' }}>
                {selectedDamage.description}
              </p>

              {/* Work Order Details */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Responsible Agency:</span>
                  <span style={{ fontWeight: 600 }}>{selectedDamage.responsible_body}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Assigned Contractor:</span>
                  <span style={{ fontWeight: 600, color: '#38bdf8' }}>{selectedDamage.assigned_contractor || 'Pending Dispatch'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Work Order ID:</span>
                  <span className="mono" style={{ color: '#cbd5e1' }}>{selectedDamage.work_order_id || 'WO-AUTO-PENDING'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Target Repair Window:</span>
                  <span style={{ color: '#fde047' }}>{selectedDamage.target_completion || 'Within 24 Hours'}</span>
                </div>
              </div>

              {/* Work Order Status Controller */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Update Work Order State:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {['REPORTED', 'IN_PROGRESS', 'REPAIRED', 'VERIFIED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedDamage.id, st)}
                      style={{
                        padding: '6px 4px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        border: selectedDamage.work_order_status === st ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                        background: selectedDamage.work_order_status === st ? '#38bdf8' : 'rgba(255, 255, 255, 0.04)',
                        color: selectedDamage.work_order_status === st ? '#090d16' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Automated Re-Scan Verification Button (Phase 5 Requirement) */}
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.07)', paddingTop: '16px' }}>
                <button
                  onClick={() => handleTriggerRescan(selectedDamage.id)}
                  disabled={rescanningId === selectedDamage.id}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <RefreshCw size={16} className={rescanningId === selectedDamage.id ? 'animate-spin' : ''} />
                  <span>
                    {rescanningId === selectedDamage.id ? 'Running Laser Re-Scan...' : 'Run Automated Re-Scan to Verify Repair'}
                  </span>
                </button>

                {selectedDamage.rescan_metric && (
                  <div style={{ marginTop: '8px', fontSize: '0.74rem', color: '#34d399', textAlign: 'center' }}>
                    &check; {selectedDamage.rescan_metric}
                  </div>
                )}
              </div>

            </div>

            {/* Map Preview */}
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '8px' }}>
                Defect GPS Coordinates: [{selectedDamage.lat}, {selectedDamage.lng}]
              </div>
              <LeafletMap 
                hotspots={hotspots}
                damages={damages}
                roadSegments={roadSegments}
                incidents={incidents}
                showDamages={true}
                showCorridors={true}
                showIncidents={true}
                height="220px"
              />
            </div>

          </div>
        )}

      </div>
    )}

    </div>
  );
}
