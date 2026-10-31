import React, { useState, useEffect } from 'react';
import { 
  Video, Upload, MapPin, AlertTriangle, Shield, CheckCircle2, 
  Activity, ArrowRight, Clock, Navigation, Wrench, Eye, RefreshCw
} from 'lucide-react';

export default function IncidentIntelligencePanel({ 
  currentRole = 'road_safety_officer', 
  onIncidentSelected = () => {},
  onOpenMapLocation = () => {}
}) {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeAlertTab, setActiveAlertTab] = useState('all'); // 'all', 'safety', 'traffic', 'maintenance'
  const [alerts, setAlerts] = useState([]);
  const [uploadName, setUploadName] = useState('silkboard_rush_dashcam.mp4');
  const [confirmingLoc, setConfirmingLoc] = useState(false);
  const [confirmedRoad, setConfirmedRoad] = useState('');
  const [confirmedLandmark, setConfirmedLandmark] = useState('');
  const [sampleFramesCount, setSampleFramesCount] = useState(5);

  useEffect(() => {
    fetchIncidents();
    fetchAlerts();
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/incidents');
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
        if (data.length > 0 && !selectedIncident) {
          setSelectedIncident(data[0]);
          setConfirmedRoad(data[0].road_name || '');
          setConfirmedLandmark(data[0].landmark || '');
        }
      }
    } catch (e) {
      console.error('Failed to load incidents', e);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/incidents/alerts/all');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (e) {
      console.error('Failed to load alerts', e);
    }
  };

  const handleRunAnalysis = async () => {
    const token = localStorage.getItem('roadguard_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    setAnalyzing(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/incidents/analyze-media', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          media_filename: uploadName,
          lat_hint: 12.9176,
          lng_hint: 77.6238,
          road_name_hint: 'Outer Ring Road (Silk Board Junction)',
          landmark_hint: 'Near BMTC Central Bus Bay',
          sample_frames: sampleFramesCount
        })
      });
      if (res.ok) {
        const newInc = await res.json();
        await fetchIncidents();
        await fetchAlerts();
        setSelectedIncident(newInc);
        setConfirmedRoad(newInc.road_name);
        setConfirmedLandmark(newInc.landmark);
        onIncidentSelected(newInc);
      }
    } catch (e) {
      console.error('Analysis failed', e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmLocation = async () => {
    if (!selectedIncident) return;
    const token = localStorage.getItem('roadguard_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`http://localhost:8000/api/v1/incidents/${selectedIncident.id}/confirm-location`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          lat: selectedIncident.lat,
          lng: selectedIncident.lng,
          road_name: confirmedRoad || selectedIncident.road_name,
          landmark: confirmedLandmark || selectedIncident.landmark
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedIncident(updated);
        await fetchIncidents();
        setConfirmingLoc(false);
      }
    } catch (e) {
      console.error('Location confirmation error', e);
    }
  };

  const handleAlertStatus = async (alertId, newStatus) => {
    const token = localStorage.getItem('roadguard_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`http://localhost:8000/api/v1/incidents/alerts/${alertId}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await fetchAlerts();
      }
    } catch (e) {
      console.error('Failed to update alert status', e);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (activeAlertTab === 'all') return true;
    return a.department === activeAlertTab;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Media Ingestion & Model Pipeline Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '14px',
        padding: '20px 24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                padding: '8px',
                borderRadius: '8px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Video size={20} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                RoadGuard AI — Video Damage & Geospatial Incident Intelligence
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Evaluates road footage using pretrained <strong>YOLO26m</strong> (Potholes), <strong>YOLOv8 RDD2022</strong> (Cracks & Distress), and <strong>YOLOv8 + ByteTrack</strong> (Traffic & Conflicts).
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                background: analyzing ? '#475569' : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: 'white',
                fontWeight: 600,
                fontSize: '13px',
                cursor: analyzing ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                transition: 'all 0.2s'
              }}
            >
              {analyzing ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
              {analyzing ? 'Analyzing Video...' : 'Analyze Dashcam Video'}
            </button>
          </div>
        </div>

        {/* Pipeline Specs Pill Row */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            Primary Potholes: mfranzon/pothole-yolo26 (YOLO26m)
          </span>
          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
            Cracks & Distress: RDD2022 D00-D40
          </span>
          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
            Flow & Conflicts: YOLOv8 + ByteTrack
          </span>
          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            Privacy Guard: Ephemeral Tracker IDs & Face Blur
          </span>
        </div>
      </div>

      {/* Main Grid: Incident Inspector on Left, Alerts & Location on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(320px, 1fr)', gap: '20px' }}>
        
        {/* Left Column: Incident Details & Detections Timeline */}
        {selectedIncident ? (
          <div style={{
            background: 'var(--bg-surface, #0f172a)',
            border: '1px solid var(--border-subtle, #334155)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: selectedIncident.risk_class === 'CRITICAL' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: selectedIncident.risk_class === 'CRITICAL' ? '#f43f5e' : '#f59e0b',
                  marginRight: '8px'
                }}>
                  {selectedIncident.risk_class} RISK ({selectedIncident.risk_score}/100)
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {selectedIncident.id}
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: '6px 0 0 0' }}>
                  {selectedIncident.title}
                </h3>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: '11px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: selectedIncident.location_confirmed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                  color: selectedIncident.location_confirmed ? '#34d399' : '#eab308',
                  fontWeight: 600
                }}>
                  {selectedIncident.location_confirmed ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                  {selectedIncident.location_confirmed ? 'GPS Confirmed' : 'Location Pending'}
                </span>
              </div>
            </div>

            {/* Geographical Location Card */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(51, 65, 85, 0.8)',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '13px', fontWeight: 600 }}>
                  <MapPin size={16} />
                  <span>{selectedIncident.road_name}</span>
                </div>
                <button
                  onClick={() => onOpenMapLocation(selectedIncident.lat, selectedIncident.lng)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #0284c7',
                    borderRadius: '4px',
                    color: '#38bdf8',
                    fontSize: '11px',
                    padding: '2px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Navigation size={12} /> View on Map
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Landmark: {selectedIncident.landmark || 'Identified roadside marker'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                GPS: {selectedIncident.lat.toFixed(4)}° N, {selectedIncident.lng.toFixed(4)}° E | Corridor ID: {selectedIncident.road_segment_id || 'SEG-001'}
              </div>

              {/* Inline Location Confirmation Toggle */}
              {confirmingLoc ? (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    value={confirmedRoad}
                    onChange={(e) => setConfirmedRoad(e.target.value)}
                    placeholder="Refined Road Name"
                    style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '6px 10px', color: '#f8fafc', fontSize: '12px' }}
                  />
                  <input
                    type="text"
                    value={confirmedLandmark}
                    onChange={(e) => setConfirmedLandmark(e.target.value)}
                    placeholder="Specific Landmark / Intersection"
                    style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '6px 10px', color: '#f8fafc', fontSize: '12px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleConfirmLocation}
                      style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Save Confirmed GPS
                    </button>
                    <button
                      onClick={() => setConfirmingLoc(false)}
                      style={{ background: '#475569', color: '#cbd5e1', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '4px' }}>
                  <button
                    onClick={() => setConfirmingLoc(true)}
                    style={{ background: 'none', border: 'none', color: '#93c5fd', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Edit / Confirm Geographic Details
                  </button>
                </div>
              )}
            </div>

            {/* Detected Hazards & Metrics Counter */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <div style={{ background: '#1e293b', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Potholes (D40)</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#f43f5e' }}>{selectedIncident.potholes_count}</div>
              </div>
              <div style={{ background: '#1e293b', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Cracks (D00-D20)</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#eab308' }}>{selectedIncident.cracks_count}</div>
              </div>
              <div style={{ background: '#1e293b', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Vehicles Flow</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8' }}>{selectedIncident.vehicles_count}</div>
              </div>
              <div style={{ background: '#1e293b', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Conflicts</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#f43f5e' }}>{selectedIncident.conflicts_count}</div>
              </div>
            </div>

            {/* Frame Detections with Bounding Box Timeline */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={15} color="#38bdf8" /> Detected Road Defects & Timestamps
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {(selectedIncident.evidence?.detections || []).map((det, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(51, 65, 85, 0.6)',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', color: '#94a3b8', fontSize: '11px' }}>
                        [{det.timestamp}s]
                      </span>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: det.rdd_code === 'D40' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                        color: det.rdd_code === 'D40' ? '#f43f5e' : '#eab308'
                      }}>
                        {det.class_name}
                      </span>
                      {det.severity_depth_mm && (
                        <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                          Depth: ~{det.severity_depth_mm}mm
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                        {(det.confidence * 100).toFixed(0)}% Conf
                      </span>
                      <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                        Box: [{det.box.slice(0, 2).join(',')}]
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Select an incident or run an analysis above.
          </div>
        )}

        {/* Right Column: Multi-Department Actionable Alerts Center */}
        <div style={{
          background: 'var(--bg-surface, #0f172a)',
          border: '1px solid var(--border-subtle, #334155)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Department-Specific Actionable Alerts
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Multi-agency alerts automatically dispatched from the analyzed incident evidence.
            </p>
          </div>

          {/* Department Tabs */}
          <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
            {[
              { id: 'all', label: 'All Alerts', color: '#94a3b8' },
              { id: 'safety', label: 'Road Safety (Authority)', color: '#38bdf8' },
              { id: 'traffic', label: 'Traffic Police', color: '#fb923c' },
              { id: 'maintenance', label: 'Road Maintenance (BBMP)', color: '#eab308' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveAlertTab(tab.id)}
                style={{
                  background: activeAlertTab === tab.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  border: activeAlertTab === tab.id ? '1px solid #0284c7' : '1px solid transparent',
                  borderRadius: '6px',
                  color: activeAlertTab === tab.id ? '#f8fafc' : '#94a3b8',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Alert Cards Feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
            {filteredAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '13px' }}>
                No active alerts in this category.
              </div>
            ) : (
              filteredAlerts.map(alt => {
                const isSafety = alt.department === 'safety';
                const isTraffic = alt.department === 'traffic';
                const isMaint = alt.department === 'maintenance';
                const badgeColor = isSafety ? '#38bdf8' : isTraffic ? '#fb923c' : '#eab308';

                return (
                  <div key={alt.id} style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    border: `1px solid ${badgeColor}33`,
                    borderLeft: `4px solid ${badgeColor}`,
                    borderRadius: '8px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: `${badgeColor}22`,
                          color: badgeColor,
                          marginRight: '6px'
                        }}>
                          {alt.department}
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>
                          {alt.severity} | {alt.id}
                        </span>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', margin: '4px 0 0 0' }}>
                          {alt.title}
                        </h4>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: alt.status === 'ACTIONED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                        color: alt.status === 'ACTIONED' ? '#34d399' : '#eab308',
                        fontWeight: 600
                      }}>
                        {alt.status}
                      </span>
                    </div>

                    <p style={{ fontSize: '12px', color: '#cbd5e1', margin: 0, lineHeight: 1.4 }}>
                      {alt.message}
                    </p>

                    <div style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#93c5fd',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px'
                    }}>
                      <strong style={{ color: '#f8fafc', whiteSpace: 'nowrap' }}>Action:</strong>
                      <span>{alt.recommended_action}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                      {alt.status !== 'ACTIONED' && (
                        <button
                          onClick={() => handleAlertStatus(alt.id, 'ACTIONED')}
                          style={{
                            background: '#0284c7',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '4px 10px',
                            cursor: 'pointer'
                          }}
                        >
                          Mark Actioned
                        </button>
                      )}
                      {alt.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleAlertStatus(alt.id, 'ACKNOWLEDGED')}
                          style={{
                            background: '#334155',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#cbd5e1',
                            fontSize: '11px',
                            padding: '4px 10px',
                            cursor: 'pointer'
                          }}
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
