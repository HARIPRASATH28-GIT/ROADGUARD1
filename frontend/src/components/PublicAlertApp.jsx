import React, { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, Volume2, VolumeX, Vibrate, ShieldCheck, 
  Play, Square, Compass, AlertTriangle, CheckCircle2, MapPin
} from 'lucide-react';
import LeafletMap from './LeafletMap';

// On-device Haversine distance calculator (meters)
function getHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function PublicAlertApp() {
  const [approvedHotspots, setApprovedHotspots] = useState([]);
  const [approvedDamages, setApprovedDamages] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [activeAlert, setActiveAlert] = useState(null);
  const [currentDist, setCurrentDist] = useState(null);

  // Simulated Drive State
  const [isSimulatingDrive, setIsSimulatingDrive] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  const [currentCoord, setCurrentCoord] = useState({ lat: 12.9250, lng: 77.6320 }); // starting ~1.2km north-east
  const simIntervalRef = useRef(null);

  // Simulated GPS Waypoints approaching Silk Board Merge (12.9172, 77.6228)
  const DRIVE_WAYPOINTS = [
    { lat: 12.9250, lng: 77.6320, name: 'Starting 1.3 km away' },
    { lat: 12.9228, lng: 77.6295, name: 'Approaching arterial corridor (950m)' },
    { lat: 12.9205, lng: 77.6270, name: 'Approaching outer boundary (600m)' },
    { lat: 12.9188, lng: 77.6248, name: 'Entering Outer Alert Buffer (380m)' },
    { lat: 12.9178, lng: 77.6234, name: 'INSIDE 300m GEOFENCE (120m)' }, // Triggers alert!
    { lat: 12.9173, lng: 77.6229, name: 'At Junction Merge (20m)' },
    { lat: 12.9160, lng: 77.6215, name: 'Passed Junction Safe Zone' }
  ];

  // Fetch only approved hotspots & damages
  useEffect(() => {
    async function loadPublicData() {
      try {
        const [hRes, dRes] = await Promise.all([
          fetch('http://localhost:8000/api/v1/public/approved-hotspots'),
          fetch('http://localhost:8000/api/v1/public/approved-damages')
        ]);
        if (hRes.ok) setApprovedHotspots(await hRes.json());
        if (dRes.ok) setApprovedDamages(await dRes.json());
      } catch (e) {
        console.error("Public data load error", e);
      }
    }
    loadPublicData();
  }, []);

  // On-device Geofence Evaluation Engine (Zero Knowledge)
  const evaluateOnDeviceGeofence = (userLat, userLng) => {
    let triggered = null;
    let shortest = Infinity;

    for (const hs of approvedHotspots) {
      const dist = getHaversineDistanceMeters(userLat, userLng, hs.lat, hs.lng);
      if (dist < shortest) shortest = dist;

      // Within ~300m
      if (dist <= (hs.geofence_radius_meters || 300)) {
        triggered = { ...hs, distanceMeters: Math.round(dist) };
        break;
      }
    }

    setCurrentDist(Math.round(shortest));

    if (triggered) {
      setActiveAlert(triggered);
      triggerHapticsAndSpeech(triggered);
    } else {
      setActiveAlert(null);
    }
  };

  // Cross-Platform Haptics & Speech Synthesis
  const triggerHapticsAndSpeech = (hotspot) => {
    // 1. Haptics (Vibration API - Android Chrome)
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 300]);
      } catch (e) {
        console.log("Vibration API unavailable", e);
      }
    }

    // 2. Speech Synthesis (Web Speech API)
    if (audioEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop prior queue
      const phrase = `Road safety alert. Approaching ${hotspot.warning_tag}. Please slow down and watch crosswalks.`;
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Start / Stop Simulated Drive
  const startSimulatedDrive = () => {
    setIsSimulatingDrive(true);
    setSimIndex(0);
    setCurrentCoord(DRIVE_WAYPOINTS[0]);
    evaluateOnDeviceGeofence(DRIVE_WAYPOINTS[0].lat, DRIVE_WAYPOINTS[0].lng);

    let idx = 0;
    simIntervalRef.current = setInterval(() => {
      idx += 1;
      if (idx >= DRIVE_WAYPOINTS.length) {
        stopSimulatedDrive();
        return;
      }
      setSimIndex(idx);
      const coord = DRIVE_WAYPOINTS[idx];
      setCurrentCoord(coord);
      evaluateOnDeviceGeofence(coord.lat, coord.lng);
    }, 2800);
  };

  const stopSimulatedDrive = () => {
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    setIsSimulatingDrive(false);
  };

  // Real device geolocation toggle if available
  const enableRealGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCurrentCoord({ lat: latitude, lng: longitude });
          evaluateOnDeviceGeofence(latitude, longitude);
        },
        (err) => {
          console.warn("Geolocation watch failed:", err.message);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              Public Safety Alerts &amp; Geofence PWA
            </h1>
            <span className="badge badge-approved">On-Device Zero-Knowledge</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            No route search &bull; No turn-by-turn &bull; Pure safety alerts triggered within ~300m of officer-approved hotspots
          </p>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className="btn-ghost"
        >
          {audioEnabled ? <Volume2 size={16} color="#34d399" /> : <VolumeX size={16} color="#f43f5e" />}
          <span>Voice Alerts: {audioEnabled ? 'ON' : 'MUTED'}</span>
        </button>
      </div>

      {/* Zero-Knowledge Privacy Architecture Notice */}
      <div className="glass-panel" style={{ 
        padding: '14px 18px', 
        marginBottom: '20px', 
        border: '1px solid rgba(16, 185, 129, 0.3)',
        background: 'rgba(16, 185, 129, 0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={20} color="#34d399" />
        </div>
        <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.4 }}>
          <strong>Zero-Knowledge Location Security:</strong> Your GPS coordinates remain entirely inside your device's browser memory. The app downloads the list of officer-approved hazards once, and proximity evaluation runs 100% client-side via Turf.js / Haversine. <em>Your location is never transmitted to any server.</em>
        </div>
      </div>

      {/* Simulated Drive Simulator Controller Card */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} color="#38bdf8" />
              <span>Simulated-Drive Live Demonstration</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Step {simIndex + 1} of {DRIVE_WAYPOINTS.length}: {DRIVE_WAYPOINTS[simIndex]?.name}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {!isSimulatingDrive ? (
              <button onClick={startSimulatedDrive} className="btn-primary">
                <Play size={16} />
                <span>Start Simulated Drive</span>
              </button>
            ) : (
              <button onClick={stopSimulatedDrive} className="btn-danger">
                <Square size={16} />
                <span>Stop Drive Simulation</span>
              </button>
            )}

            <button onClick={enableRealGPS} className="btn-ghost" title="Use current device GPS">
              <MapPin size={16} />
              <span>Use Real GPS</span>
            </button>
          </div>
        </div>

        {/* Progress Tracker Bar */}
        <div style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden', marginTop: '14px' }}>
          <div style={{ 
            width: `${((simIndex + 1) / DRIVE_WAYPOINTS.length) * 100}%`, 
            height: '100%', 
            background: isSimulatingDrive ? 'linear-gradient(90deg, #0284c7, #f43f5e)' : '#334155',
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>

      {/* Active High-Risk Alert HUD (Shown when within 300m) */}
      {activeAlert && (
        <div className="glass-panel pulse-red" style={{ 
          padding: '24px', 
          marginBottom: '20px', 
          background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.25) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '2px solid #f43f5e',
          boxShadow: '0 0 35px rgba(244, 63, 94, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ 
                width: '52px', 
                height: '52px', 
                borderRadius: '50%', 
                background: '#f43f5e', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 0 20px #f43f5e'
              }}>
                <AlertTriangle size={30} color="#ffffff" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fca5a5' }}>
                  GEOFENCE ALERT &bull; WITHIN {activeAlert.distanceMeters} METERS
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff' }}>
                  {activeAlert.warning_tag}
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#fecdd3', marginTop: '2px' }}>
                  {activeAlert.name} &bull; Cause: <strong>{activeAlert.cause_tag}</strong>
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'rgba(0, 0, 0, 0.4)', 
              padding: '10px 18px', 
              borderRadius: '10px', 
              textAlign: 'center',
              border: '1px solid rgba(244, 63, 94, 0.4)'
            }}>
              <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>SAFE DRIVING ADVISORY</div>
              <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.9rem', marginTop: '2px' }}>
                Strict 20-30 km/h Limit &bull; Watch Crosswalks
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Map: Shows Approved Hotspots, Damages & Simulated Vehicle Position */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            Approved Hazards Map &bull; Distance to Nearest Hazard:{' '}
            <span className="mono" style={{ color: currentDist <= 300 ? '#f43f5e' : '#38bdf8' }}>
              {currentDist !== null ? `${currentDist}m` : 'Calculating...'}
            </span>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Showing {approvedHotspots.length} Officer-Approved Hotspots &bull; {approvedDamages.length} Damage Markers
          </div>
        </div>

        <LeafletMap 
          hotspots={approvedHotspots}
          damages={approvedDamages}
          showDamages={true}
          userLocation={{
            lat: currentCoord.lat,
            lng: currentCoord.lng,
            targetHotspot: approvedHotspots[0]
          }}
          height="420px"
        />
      </div>

    </div>
  );
}
