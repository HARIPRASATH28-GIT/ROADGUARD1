import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

export default function LeafletMap({
  hotspots = [],
  damages = [],
  incidents = [],
  roadSegments = [],
  selectedHotspotId = null,
  onSelectHotspot = () => {},
  onSelectIncident = () => {},
  showDamages = false,
  showIncidents = true,
  showCorridors = true,
  isPickingLocation = false,
  onLocationPicked = () => {},
  userLocation = null,
  height = '500px'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseTileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const corridorsLayerRef = useRef(null);
  const [mapStyle, setMapStyle] = useState('dark'); // 'dark', 'street', 'satellite'
  const [pickedLocation, setPickedLocation] = useState(null);

  // Available tile layer providers (Free, OpenSource, No API Key required)
  const tileProviders = {
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors'
    },
    dark: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: Bangalore central arterial network
      const map = L.map(mapContainerRef.current, {
        center: [12.9716, 77.5946],
        zoom: 12,
        zoomControl: true
      });

      const initialLayer = L.tileLayer(tileProviders[mapStyle].url, {
        attribution: tileProviders[mapStyle].attribution,
        maxZoom: 19
      }).addTo(map);

      baseTileLayerRef.current = initialLayer;
      corridorsLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Handle map clicks for Location Pinning / Confirmation
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setPickedLocation({ lat, lng });
        onLocationPicked(lat, lng);
      });

      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    }

    const map = mapInstanceRef.current;
    if (map) {
      map.invalidateSize();
      if (selectedHotspotId) {
        const target = hotspots.find(h => h.id === selectedHotspotId);
        if (target) {
          map.panTo([target.lat, target.lng], { animate: true });
        }
      }
    }

    // Switch Tile Layer if style changed
    if (baseTileLayerRef.current && map) {
      map.removeLayer(baseTileLayerRef.current);
      const newTileLayer = L.tileLayer(tileProviders[mapStyle].url, {
        attribution: tileProviders[mapStyle].attribution,
        maxZoom: 19
      }).addTo(map);
      baseTileLayerRef.current = newTileLayer;
      
      // Keep tile layer behind vector markers
      newTileLayer.bringToBack();
    }

    // Clear Layers
    const corridorsLayer = corridorsLayerRef.current;
    const markersLayer = markersLayerRef.current;
    corridorsLayer.clearLayers();
    markersLayer.clearLayers();

    // 1. RENDER ROAD-SEGMENT HAZARD VISUALIZATION (Color-Coded Risk Polylines)
    if (showCorridors && roadSegments.length > 0) {
      roadSegments.forEach(seg => {
        const level = seg.hazard_level || 'MEDIUM';
        let color = '#10b981'; // Green
        let weight = 5;
        if (level === 'CRITICAL') {
          color = '#ef4444'; // Red
          weight = 6;
        } else if (level === 'HIGH') {
          color = '#f97316'; // Orange
          weight = 5;
        } else if (level === 'MEDIUM') {
          color = '#eab308'; // Amber
          weight = 4;
        }

        // Draw shadow/glow polyline underneath
        if (level === 'CRITICAL' || level === 'HIGH') {
          const glowLine = L.polyline(seg.geometry, {
            color: color,
            weight: weight + 6,
            opacity: 0.35,
            lineCap: 'round'
          });
          corridorsLayer.addLayer(glowLine);
        }

        // Draw main colored corridor line
        const polyline = L.polyline(seg.geometry, {
          color: color,
          weight: weight,
          opacity: 0.9,
          lineCap: 'round',
          dashArray: level === 'CRITICAL' ? '8, 6' : null
        });

        polyline.bindPopup(`
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 220px; color: #f8fafc;">
            <div style="font-size: 13px; font-weight: 700; color: ${color}; margin-bottom: 4px;">
              ${seg.corridor_name}
            </div>
            <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${color}25; color: ${color}; font-weight: 700;">
                ${level} HAZARD
              </span>
              <span style="font-size: 10px; color: #94a3b8;">
                Speed Limit: ${seg.speed_limit_kmh} km/h
              </span>
            </div>
            <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 4px;">
              Avg Daily Traffic: <strong>${(seg.avg_daily_traffic || 0).toLocaleString()}</strong> vehicles
            </div>
            <div style="font-size: 11px; color: #cbd5e1;">
              Pothole Density: <strong>${seg.pothole_density_km || 0}</strong> defects/km
            </div>
          </div>
        `);

        corridorsLayer.addLayer(polyline);
      });
    }

    // 2. RENDER GEOSPATIAL INCIDENT MARKERS
    if (showIncidents && incidents.length > 0) {
      incidents.forEach(inc => {
        const isCritical = inc.risk_class === 'CRITICAL';
        const isConfirmed = inc.location_confirmed === 1;
        const pinColor = isCritical ? '#f43f5e' : '#f59e0b';

        const incHtml = `
          <div style="
            position: relative;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: ${pinColor};
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 900;
            font-size: 12px;
            border: 2px solid ${isConfirmed ? '#10b981' : '#ffffff'};
            box-shadow: 0 0 14px ${pinColor};
            cursor: pointer;
            transition: transform 0.2s ease;
          ">
            <span>!</span>
            ${isConfirmed ? '<div style="position: absolute; top: -4px; right: -4px; width: 10px; height: 10px; border-radius: 50%; background: #10b981; border: 1.5px solid #000;"></div>' : ''}
          </div>
        `;

        const incIcon = L.divIcon({
          html: incHtml,
          className: 'custom-incident-pin',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([inc.lat, inc.lng], { icon: incIcon });
        marker.bindPopup(`
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 230px; color: #f8fafc;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 700; color: ${pinColor}; background: ${pinColor}25; padding: 2px 6px; border-radius: 4px;">
                ${inc.risk_class} RISK (${inc.risk_score}/100)
              </span>
              <span style="font-size: 10px; color: ${isConfirmed ? '#34d399' : '#eab308'}; font-weight: 600;">
                ${isConfirmed ? 'GPS Confirmed' : 'Location Pending'}
              </span>
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">
              ${inc.title}
            </div>
            <div style="font-size: 11px; color: #38bdf8; margin-bottom: 6px;">
              ${inc.road_name}
            </div>
            <div style="font-size: 11px; color: #94a3b8; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 6px;">
              <div>Potholes (D40): <strong>${inc.potholes_count}</strong></div>
              <div>Cracks (D00-D20): <strong>${inc.cracks_count}</strong></div>
              <div>Vehicles: <strong>${inc.vehicles_count}</strong></div>
              <div>Conflicts: <strong>${inc.conflicts_count}</strong></div>
            </div>
            <div style="font-size: 10px; color: #64748b; font-family: monospace;">
              GPS: ${inc.lat.toFixed(4)}, ${inc.lng.toFixed(4)}
            </div>
          </div>
        `);

        marker.on('click', () => {
          onSelectIncident(inc);
        });

        markersLayer.addLayer(marker);
      });
    }

    // 3. RENDER HOTSPOT MARKERS
    hotspots.forEach((hs) => {
      const isSelected = hs.id === selectedHotspotId;
      const risk = hs.current_risk_score || 50;
      let pinColor = '#10b981';
      if (risk >= 65) pinColor = '#f43f5e';
      else if (risk >= 35) pinColor = '#f59e0b';

      const markerHtml = `
        <div style="
          position: relative;
          width: ${isSelected ? '38px' : '28px'};
          height: ${isSelected ? '38px' : '28px'};
          border-radius: 50%;
          background: ${pinColor};
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          font-size: 11px;
          border: 3px solid ${isSelected ? '#ffffff' : 'rgba(0,0,0,0.5)'};
          box-shadow: 0 0 ${isSelected ? '24px' : '10px'} ${pinColor};
          cursor: pointer;
        ">
          ${Math.round(risk)}
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-risk-pin',
        iconSize: [isSelected ? 38 : 28, isSelected ? 38 : 28],
        iconAnchor: [isSelected ? 19 : 14, isSelected ? 19 : 14]
      });

      const marker = L.marker([hs.lat, hs.lng], { icon: customIcon });
      marker.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 200px; color: #f8fafc;">
          <div style="font-size: 13px; font-weight: 700; margin-bottom: 4px;">
            ${hs.name}
          </div>
          <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: ${pinColor}25; color: ${pinColor}; font-weight: 700;">
              Risk: ${Math.round(risk)} / 100
            </span>
            <span style="font-size: 10px; color: #94a3b8;">${hs.status}</span>
          </div>
          <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 6px;">
            <strong>Warning:</strong> ${hs.public_warning_tag || 'Caution Area'}
          </div>
        </div>
      `);
      marker.on('click', () => {
        onSelectHotspot(hs.id);
      });
      markersLayer.addLayer(marker);
    });

    // 4. RENDER PICKED PIN IN LOCATION PICKING MODE
    if (pickedLocation) {
      const pickHtml = `
        <div style="
          width: 30px;
          height: 30px;
          border-radius: 50% 50% 50% 0;
          background: #38bdf8;
          border: 2px solid white;
          transform: rotate(-45deg);
          box-shadow: 0 0 16px #0284c7;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="width: 8px; height: 8px; background: white; border-radius: 50%; transform: rotate(45deg);"></div>
        </div>
      `;
      const pickIcon = L.divIcon({
        html: pickHtml,
        className: 'picked-pin',
        iconSize: [30, 30],
        iconAnchor: [15, 30]
      });
      const pMarker = L.marker([pickedLocation.lat, pickedLocation.lng], { icon: pickIcon });
      pMarker.bindPopup(`
        <div style="font-size: 12px; color: #f8fafc;">
          <strong>Target Incident GPS Pin:</strong><br />
          Lat: ${pickedLocation.lat.toFixed(5)}<br />
          Lng: ${pickedLocation.lng.toFixed(5)}
        </div>
      `).openPopup();
      markersLayer.addLayer(pMarker);
    }

  }, [hotspots, damages, incidents, roadSegments, selectedHotspotId, showCorridors, showIncidents, mapStyle, pickedLocation]);

  return (
    <div style={{ position: 'relative', width: '100%', height: height, borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
      
      {/* Google Maps-Style Layer Control Overlay */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(51, 65, 85, 0.8)',
        borderRadius: '8px',
        padding: '6px 8px',
        display: 'flex',
        gap: '6px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
      }}>
        <button
          onClick={() => setMapStyle('dark')}
          style={{
            background: mapStyle === 'dark' ? '#0284c7' : 'transparent',
            color: mapStyle === 'dark' ? '#ffffff' : '#94a3b8',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Dark Infra
        </button>
        <button
          onClick={() => setMapStyle('street')}
          style={{
            background: mapStyle === 'street' ? '#0284c7' : 'transparent',
            color: mapStyle === 'street' ? '#ffffff' : '#94a3b8',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Street
        </button>
        <button
          onClick={() => setMapStyle('satellite')}
          style={{
            background: mapStyle === 'satellite' ? '#0284c7' : 'transparent',
            color: mapStyle === 'satellite' ? '#ffffff' : '#94a3b8',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Satellite
        </button>
      </div>

      {/* Map Canvas */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
