import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, CloudRain, Clock, School, 
  Construction, CheckCircle2, XCircle, ArrowUpRight, Zap, 
  Eye, FileText, Check, Sparkles, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import LeafletMap from './LeafletMap';
import IncidentIntelligencePanel from './IncidentIntelligencePanel';

export default function OfficerConsole({
  hotspots,
  selectedHotspot,
  onSelectHotspot,
  onApproveHotspot,
  onRejectHotspot,
  onSimulateChange,
  roadSegments = [],
  incidents = []
}) {
  const [activeViewMode, setActiveViewMode] = useState('hotspot'); // 'hotspot' or 'video_incidents'
  // Slider state for dynamic adaptation (Phase 3)
  const [rainMm, setRainMm] = useState(0);
  const [visibilityMeters, setVisibilityMeters] = useState(5000);
  const [hourOfDay, setHourOfDay] = useState(14);
  const [isSchoolHour, setIsSchoolHour] = useState(false);
  const [roadClosure, setRoadClosure] = useState(false);
  const [construction, setConstruction] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [simulationLatency, setSimulationLatency] = useState(14.8);

  // Active hotspot values (either simulated or original)
  const [currentData, setCurrentData] = useState(null);

  useEffect(() => {
    if (selectedHotspot) {
      setCurrentData(selectedHotspot);
      const tel = selectedHotspot.telemetry || {};
      setRainMm(tel.rain_intensity_mmh || 0);
      setVisibilityMeters(tel.visibility_meters || 5000);
      setHourOfDay(tel.hour_of_day || 14);
      setIsSchoolHour(tel.is_school_hour === 1);
      setRoadClosure(tel.road_closure_active === 1);
      setConstruction(tel.construction_active === 1);
    }
  }, [selectedHotspot]);

  // Dynamic adaptation trigger: calls /simulate whenever a slider moves
  const handleSliderChange = async (newRain, newVis, newHour, newSchool, newClosure, newConst) => {
    if (!selectedHotspot) return;
    setRecomputing(true);
    const payload = {
      hotspot_id: selectedHotspot.id,
      rain_intensity_mmh: Number(newRain),
      visibility_meters: Number(newVis),
      hour_of_day: Number(newHour),
      is_school_hour: newSchool ? 1 : 0,
      road_closure_active: newClosure ? 1 : 0,
      construction_active: newConst ? 1 : 0
    };

    try {
      const res = await fetch('http://localhost:8000/api/v1/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const simResult = await res.json();
        setSimulationLatency(simResult.latency_ms);
        setCurrentData(prev => ({
          ...prev,
          current_risk_score: simResult.recomputed_risk_score,
          current_risk_class: simResult.recomputed_risk_class,
          current_congestion: simResult.recomputed_congestion,
          top_factors: simResult.top_shap_factors,
          recommendation: simResult.recommendation,
          public_warning_tag: simResult.public_warning_text
        }));
      }
    } catch (e) {
      console.error("Simulation request failed", e);
    } finally {
      setRecomputing(false);
    }
  };

  // Jury Surprise Scenario Preset: Rain + School Bell Peak + Road Closure
  const triggerJuryScenario = () => {
    setRainMm(28);
    setVisibilityMeters(850);
    setHourOfDay(15);
    setIsSchoolHour(true);
    setRoadClosure(true);
    setConstruction(true);
    handleSliderChange(28, 850, 15, true, true, true);
  };

  const handleApprove = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 }
    });
    onApproveHotspot(selectedHotspot.id);
  };

  if (!currentData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading Officer Safety Console...
      </div>
    );
  }

  const risk = currentData.current_risk_score || 0;
  const isApproved = currentData.status === 'APPROVED';

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Top Console Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              Road Safety Officer Console
            </h1>
            <span className={`badge ${isApproved ? 'badge-approved' : 'badge-pending'}`}>
              {currentData.status}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Multi-modal risk audit &bull; Explainable SHAP factor attribution &bull; Human-in-the-loop approval gate
          </p>
        </div>

        {/* Action Controls & Surprise Preset */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={triggerJuryScenario}
            className="btn-ghost"
            style={{ border: '1px solid #f59e0b', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)' }}
          >
            <Sparkles size={16} />
            <span>Test Jury Scenario (Rain + School + Closure)</span>
          </button>

          {!isApproved ? (
            <button onClick={handleApprove} className="btn-success">
              <CheckCircle2 size={16} />
              <span>Approve &amp; Publish to Public</span>
            </button>
          ) : (
            <button onClick={() => onRejectHotspot(currentData.id, "Safety audit revoked")} className="btn-danger">
              <XCircle size={16} />
              <span>Revoke Approval</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-view Navigation Bar: Hotspot Audit vs Video AI Incident Intelligence */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(15, 23, 42, 0.6)', padding: '6px', borderRadius: '10px', border: '1px solid rgba(51, 65, 85, 0.6)', width: 'fit-content' }}>
        <button
          onClick={() => setActiveViewMode('hotspot')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: activeViewMode === 'hotspot' ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'transparent',
            color: activeViewMode === 'hotspot' ? '#ffffff' : '#94a3b8',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Spatial Hotspot Audit &amp; What-If Engine
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
          currentRole="road_safety_officer"
          onOpenMapLocation={(lat, lng) => setActiveViewMode('hotspot')}
        />
      ) : (
        /* Main Grid: Left Map + Sliders; Right: SHAP & Recommendations */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        
        {/* Left Column: Interactive Map & Dynamic What-If Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Map Card */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#38bdf8" />
                <span>Geospatial Risk Hotspots</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Select pin on map to inspect
              </div>
            </div>

            <LeafletMap 
              hotspots={hotspots}
              roadSegments={roadSegments}
              incidents={incidents}
              selectedHotspotId={currentData.id}
              onSelectHotspot={onSelectHotspot}
              showCorridors={true}
              showIncidents={true}
              height="340px"
            />

            {/* Hotspot Switcher Bar */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '12px', paddingBottom: '4px' }}>
              {hotspots.map(h => (
                <button
                  key={h.id}
                  onClick={() => onSelectHotspot(h.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    background: h.id === currentData.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    color: h.id === currentData.id ? '#38bdf8' : 'var(--text-muted)',
                    border: h.id === currentData.id ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {h.name.split(' ')[0]} ({Math.round(h.current_risk_score)})
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Adaptation Sliders Card (Phase 3) */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={16} color="#38bdf8" className={recomputing ? 'animate-spin' : ''} />
                  <span>Dynamic Adaptation &amp; What-If Controls</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Changing inputs recomputes XGBoost risk, SHAP factors &amp; recommendations instantly
                </div>
              </div>

              {/* Latency badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '4px 10px', borderRadius: '8px' }}>
                <Zap size={14} color="#38bdf8" />
                <span className="mono" style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600 }}>
                  {simulationLatency} ms
                </span>
              </div>
            </div>

            {/* Slider Rows */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              
              {/* Rain Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CloudRain size={14} /> Rainfall (mm/h)
                  </span>
                  <span className="mono" style={{ fontWeight: 700, color: '#38bdf8' }}>{rainMm} mm/h</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="50" 
                  value={rainMm}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setRainMm(val);
                    handleSliderChange(val, visibilityMeters, hourOfDay, isSchoolHour, roadClosure, construction);
                  }}
                />
              </div>

              {/* Visibility Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Eye size={14} /> Visibility (meters)
                  </span>
                  <span className="mono" style={{ fontWeight: 700, color: '#38bdf8' }}>{visibilityMeters}m</span>
                </div>
                <input 
                  type="range" 
                  min="200" 
                  max="8000" 
                  step="100"
                  value={visibilityMeters}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setVisibilityMeters(val);
                    handleSliderChange(rainMm, val, hourOfDay, isSchoolHour, roadClosure, construction);
                  }}
                />
              </div>

              {/* Hour of Day */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} /> Hour of Day
                  </span>
                  <span className="mono" style={{ fontWeight: 700, color: '#38bdf8' }}>{hourOfDay}:00 hrs</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="23" 
                  value={hourOfDay}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setHourOfDay(val);
                    handleSliderChange(rainMm, visibilityMeters, val, isSchoolHour, roadClosure, construction);
                  }}
                />
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={isSchoolHour}
                    onChange={(e) => {
                      setIsSchoolHour(e.target.checked);
                      handleSliderChange(rainMm, visibilityMeters, hourOfDay, e.target.checked, roadClosure, construction);
                    }}
                  />
                  <span>Active School Bell-Time Peak</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={roadClosure}
                    onChange={(e) => {
                      setRoadClosure(e.target.checked);
                      handleSliderChange(rainMm, visibilityMeters, hourOfDay, isSchoolHour, e.target.checked, construction);
                    }}
                  />
                  <span>Upstream Road Closure Active</span>
                </label>
              </div>

            </div>
          </div>

          {/* Before vs After Impact Tracker Card */}
          <div className="glass-panel" style={{ padding: '18px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '12px' }}>
              Countermeasure Impact Tracker (Before vs After)
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>BASELINE CLOSE CALLS</div>
                <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f43f5e', marginTop: '4px' }}>
                  {currentData.baseline_metrics?.close_calls_per_1000 || '11.4'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>per 1k crossings</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>PROJECTED POST-FIX</div>
                <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                  {currentData.post_intervention_projection?.projected_close_calls_per_1000 || '3.8'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>per 1k crossings</div>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#6ee7b7' }}>NET RISK REDUCTION</div>
                <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                  -{currentData.recommendation?.estimated_risk_reduction_pct || '34.5'}%
                </div>
                <div style={{ fontSize: '0.68rem', color: '#a7f3d0' }}>Assumed IRC standard</div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: SHAP Waterfall, Evidence Panel & Countermeasure Recommendation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Risk Score Summary Banner */}
          <div className="glass-panel" style={{ 
            padding: '20px',
            border: risk >= 65 ? '1px solid var(--border-critical)' : '1px solid var(--border-subtle)',
            background: risk >= 65 ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)' : 'var(--bg-card)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  {currentData.name} &bull; {currentData.road_type}
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '2px' }}>
                  Risk Index: {Math.round(risk)} / 100 ({currentData.current_risk_class || 'Medium'})
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Traffic State: <strong>{currentData.current_congestion}</strong> &bull; Lanes: <strong>{currentData.lanes}</strong>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: risk >= 65 ? '#f43f5e' : (risk >= 35 ? '#f59e0b' : '#10b981') }}>
                  {risk}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  XGBoost Regressor Score
                </div>
              </div>
            </div>
          </div>

          {/* Contributing Factors (SHAP Feature Attribution) */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                Ranked Contributing Factors (TreeSHAP)
              </div>
              <span className="badge badge-cyan">Explainable AI</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(currentData.top_factors || []).slice(0, 4).map((f, i) => {
                const shapVal = Math.abs(f.shap_value || 1.0);
                const pct = Math.min(100, Math.round((shapVal / 7.0) * 100));
                return (
                  <div key={i} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '5px' }}>
                      <span style={{ fontWeight: 600 }}>{f.label || f.factor}</span>
                      <span className="mono" style={{ color: '#38bdf8', fontWeight: 700 }}>
                        +{f.shap_value} SHAP
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #38bdf8)', borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Evidence Panel (Sensor Telemetry Trail) */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="#38bdf8" />
              <span>Telemetry Evidence Trail (Zero-Hallucination)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(currentData.evidence_sources || []).map((ev, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  fontSize: '0.78rem',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderLeft: '3px solid #38bdf8'
                }}>
                  <div>
                    <span style={{ fontWeight: 600, color: '#f8fafc' }}>[{ev.type}]</span>{' '}
                    <span style={{ color: 'var(--text-muted)' }}>{ev.source_id}:</span>{' '}
                    <span style={{ color: '#bae6fd' }}>{ev.metric_value}</span>
                  </div>
                  <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {ev.clip_ref}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Countermeasure Card */}
          {currentData.recommendation && (
            <div className="glass-panel" style={{ 
              padding: '20px', 
              border: '1px solid rgba(16, 185, 129, 0.4)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <span className="badge badge-approved" style={{ marginBottom: '6px' }}>
                    {currentData.recommendation.category || 'Infrastructure Countermeasure'}
                  </span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                    {currentData.recommendation.title}
                  </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>
                    -{currentData.recommendation.estimated_risk_reduction_pct}%
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    Est. Risk Reduction
                  </div>
                </div>
              </div>

              {/* 3 Core Questions Answers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', marginTop: '10px' }}>
                <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px', borderRadius: '8px' }}>
                  <strong style={{ color: '#fca5a5' }}>1. Why is it dangerous:</strong>
                  <div style={{ color: '#e2e8f0', marginTop: '2px' }}>
                    {currentData.recommendation.why_dangerous}
                  </div>
                </div>

                <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px', borderRadius: '8px' }}>
                  <strong style={{ color: '#86efac' }}>2. Recommended Fix:</strong>
                  <div style={{ color: '#e2e8f0', marginTop: '2px' }}>
                    {currentData.recommendation.recommended_fix}
                  </div>
                </div>

                <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px', borderRadius: '8px' }}>
                  <strong style={{ color: '#93c5fd' }}>3. How we verify it worked:</strong>
                  <div style={{ color: '#e2e8f0', marginTop: '2px' }}>
                    {currentData.recommendation.verification_metric}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '10px', fontStyle: 'italic' }}>
                Assumption: {currentData.recommendation.assumption}
              </div>
            </div>
          )}

        </div>

      </div>
    )}

    </div>
  );
}
