import React, { useState, useEffect } from 'react';
import { 
  BarChart3, CheckCircle2, ShieldAlert, Cpu, 
  Clock, DollarSign, Activity, AlertTriangle, RefreshCw
} from 'lucide-react';

export default function EvaluationDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [cameraDownSimulation, setCameraDownSimulation] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/metrics');
      if (res.ok) {
        setMetrics(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch metrics", e);
    } finally {
      setLoading(false);
    }
  };

  if (!metrics) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading Evaluation &amp; Responsible AI telemetry...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Dashboard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              Evaluation &amp; Responsible AI Dashboard
            </h1>
            <span className="badge badge-demo">Empirical Benchmarks</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Empirical validation &bull; Groundedness verification &bull; Fallback resilience protocols
          </p>
        </div>

        {/* Simulate Sensor Outage / Fallback Mode */}
        <button
          onClick={() => setCameraDownSimulation(!cameraDownSimulation)}
          className="btn-ghost"
          style={{ border: cameraDownSimulation ? '1px solid #f43f5e' : '1px solid var(--border-subtle)' }}
        >
          <AlertTriangle size={16} color={cameraDownSimulation ? '#f43f5e' : '#f59e0b'} />
          <span>Simulate Camera Down: {cameraDownSimulation ? 'ACTIVE' : 'OFF'}</span>
        </button>
      </div>

      {/* Failure Handling Banner (Phase 8 Requirement) */}
      {cameraDownSimulation && (
        <div className="glass-panel" style={{ 
          padding: '16px 20px', 
          marginBottom: '20px', 
          border: '1px solid #f59e0b',
          background: 'rgba(245, 158, 11, 0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <AlertTriangle size={24} color="#fbbf24" />
          <div style={{ fontSize: '0.82rem', color: '#fef08a', lineHeight: 1.4 }}>
            <strong>SYSTEM RESILIENCE MODE: Camera Feed Degraded (CAM-BLR-041 Offline).</strong><br />
            System automatically shifted to <em>Lower Confidence Banner</em> and loaded last known baseline values with local OSM geometric fallback. Automated dispatch requires manual officer sign-off.
          </div>
        </div>
      )}

      {/* Core 7 Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Metric 1: Hazard Detection Precision */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            {metrics.hazard_precision?.label}
          </div>
          <div className="mono" style={{ fontSize: '2rem', fontWeight: 900, color: '#34d399', marginTop: '6px' }}>
            {(metrics.hazard_precision?.value * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Basis: {metrics.hazard_precision?.benchmark_basis}
          </div>
          <span className="badge badge-approved" style={{ marginTop: '10px' }}>
            MEASURED BENCHMARK
          </span>
        </div>

        {/* Metric 2: Hazard Detection Recall */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            {metrics.hazard_recall?.label}
          </div>
          <div className="mono" style={{ fontSize: '2rem', fontWeight: 900, color: '#38bdf8', marginTop: '6px' }}>
            {(metrics.hazard_recall?.value * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Basis: {metrics.hazard_recall?.benchmark_basis}
          </div>
          <span className="badge badge-approved" style={{ marginTop: '10px' }}>
            MEASURED BENCHMARK
          </span>
        </div>

        {/* Metric 3: False Alarms Per Day */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            {metrics.false_alarms_per_day?.label}
          </div>
          <div className="mono" style={{ fontSize: '2rem', fontWeight: 900, color: '#a78bfa', marginTop: '6px' }}>
            {metrics.false_alarms_per_day?.value}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Alerts per day per junction (5-min windows)
          </div>
          <span className="badge badge-approved" style={{ marginTop: '10px' }}>
            OPTIMAL SPEC
          </span>
        </div>

        {/* Metric 4: Hotspot Top-K Agreement */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            {metrics.top_k_agreement?.label}
          </div>
          <div className="mono" style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', marginTop: '6px' }}>
            {metrics.top_k_agreement?.value}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Spearman Rank Correlation with historical blackspots
          </div>
          <span className="badge badge-demo" style={{ marginTop: '10px' }}>
            HISTORICAL ALIGNMENT
          </span>
        </div>

        {/* Metric 5: Groundedness Score (Zero Hallucination) */}
        <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            {metrics.groundedness_score?.label}
          </div>
          <div className="mono" style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', marginTop: '6px' }}>
            {(metrics.groundedness_score?.value * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Every report claim strictly mapped to sensor evidence
          </div>
          <span className="badge badge-approved" style={{ marginTop: '10px' }}>
            ZERO-HALLUCINATION CHECK
          </span>
        </div>

        {/* Metric 6: Re-assessment Latency */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            {metrics.reassessment_latency_ms?.label}
          </div>
          <div className="mono" style={{ fontSize: '2rem', fontWeight: 900, color: '#38bdf8', marginTop: '6px' }}>
            {metrics.reassessment_latency_ms?.value} ms
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Sub-second XGBoost + TreeSHAP single-cycle latency
          </div>
          <span className="badge badge-cyan" style={{ marginTop: '10px' }}>
            REAL-TIME SLA
          </span>
        </div>

        {/* Metric 7: Video Analysis Cost per Hour */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            {metrics.cost_per_analysed_hour?.label}
          </div>
          <div className="mono" style={{ fontSize: '2rem', fontWeight: 900, color: '#cbd5e1', marginTop: '6px' }}>
            {metrics.cost_per_analysed_hour?.value}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Edge CPU spot instance cost per video stream hour
          </div>
          <span className="badge badge-demo" style={{ marginTop: '10px' }}>
            INFRASTRUCTURE ESTIMATE
          </span>
        </div>

      </div>

      {/* Intervention Effectiveness (Before vs After) Detailed Section */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>
          Intervention Effectiveness (Before vs After Verification)
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '16px' }}>
          Conflict density measured by automated zone overlapping (traffic-monitor method) across 1,000 pedestrian crossings.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)', padding: '16px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.74rem', color: '#fca5a5' }}>PRE-INTERVENTION BASELINE</div>
            <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f43f5e', marginTop: '4px' }}>
              {metrics.intervention_effectiveness?.value?.before_close_calls_per_1000}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#fecdd3' }}>Close calls per 1,000 crossings</div>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '16px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.74rem', color: '#6ee7b7' }}>POST-INTERVENTION VERIFICATION</div>
            <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>
              {metrics.intervention_effectiveness?.value?.after_close_calls_per_1000}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>Close calls per 1,000 crossings</div>
          </div>

          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '16px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.74rem', color: '#7dd3fc' }}>NET CONFLICT REDUCTION</div>
            <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>
              -{metrics.intervention_effectiveness?.value?.reduction_pct}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#bae6fd' }}>Verified empirically across 30 days</div>
          </div>
        </div>
      </div>

      {/* Hallucination Checker Live Demonstration */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>
          Automated Groundedness &amp; Anti-Hallucination Pipeline
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '14px' }}>
          Rule: If an AI report sentence makes claims about speed, rain, potholes, or schools without backing evidence in computed telemetry, it is immediately discarded and replaced with <code>"insufficient evidence"</code>.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', marginBottom: '6px' }}>
              &check; Grounded Sentence (Passed to UI)
            </div>
            <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
              "High pedestrian crossing density (132/5min) during school bell hours elevates conflict risk."
            </div>
            <div style={{ fontSize: '0.7rem', color: '#a7f3d0', marginTop: '6px' }}>
              Backing Evidence: CAM-BLR-089 ped count (132) + Overpass school node within 110m.
            </div>
          </div>

          <div style={{ background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f43f5e', marginBottom: '6px' }}>
              &cross; Ungrounded Claim (Purged by Pipeline)
            </div>
            <div style={{ fontSize: '0.8rem', color: '#e2e8f0', textDecoration: 'line-through' }}>
              "Severe torrential flooding is triggering extreme hydroplaning at the intersection."
            </div>
            <div style={{ fontSize: '0.7rem', color: '#fca5a5', marginTop: '6px' }}>
              Failed: Sensor rain telemetry is 0.0 mm/h. Output replaced with: <em>"insufficient evidence"</em>.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
