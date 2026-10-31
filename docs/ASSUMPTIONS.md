# RoadGuard AI - Engineering Assumptions & Design Contracts

## 1. Ethical & Privacy Guardrails (Strict Non-Negotiables)
- **Zero Identity Surveillance:** No license plates or facial recognition data are ever extracted, stored, or transmitted.
- **Temporary Tracking IDs:** Tracker IDs (via ByteTrack) exist solely in volatile memory during video processing to determine speed vectors and zone crossings. They are immediately discarded after computing window aggregates.
- **Aggregates Only:** Outputs are strictly aggregate metrics (vehicle counts, average approach speed, pedestrian crossing counts, close-call frequency).
- **Human-in-the-Loop Approval:** No hotspot or automated intervention is published to the public alert system or dispatched to road maintenance without explicit sign-off by a Road Safety Officer.
- **Evidence-Grounded Explanations:** Every textual reason and factor explanation is bound to computed evidence (sensor telemetry, SHAP factor attribution, Overpass road geometry, OpenWeather observations). If underlying evidence is below threshold, the system explicitly reports `"insufficient evidence"`.
- **Synthetic Data Transparency:** Any synthetic training labels or mock sensor streams are visibly labeled as `DEMO / SYNTHETIC` in the UI to prevent mistaking simulation for production reality.

## 2. Risk Engine & SHAP Assumptions
- **Risk Score Formulation:** Risk is a normalized index ($0 - 100$) derived from an XGBoost gradient-boosted ensemble trained on traffic dynamics, weather severity, visibility impairment, road infrastructure classification, and vulnerability proximity (schools, hospitals).
- **Intervention Impact Bounds:** Interventions (e.g. raised pedestrian crossing, speed table, retroreflective warning signs, dynamic signal phase adjustment, pothole patching) have empirical risk reduction ranges based on IRC (Indian Roads Congress) and FHWA safety countermeasure research:
  - *Raised Pedestrian Crossing:* 25% - 40% reduction in pedestrian conflict.
  - *Speed Table:* 15% - 30% reduction in approach speed risk.
  - *High-Mast LED Lighting:* 20% - 35% reduction in nighttime/low-visibility hazards.
  - *High-Friction Surfacing / Patching:* 18% - 32% reduction in wet-weather skids.
  - *Dynamic Signal Retiming / Queue Flushing:* 15% - 28% reduction in gridlock / junction rear-ends.
- **Before/After Baseline:** Post-intervention risk is projected assuming standard adherence rates, tracked against baseline observation windows.

## 3. Sensor & Geometry Integration
- **OpenWeather Fallback:** If `OPENWEATHER_API_KEY` is not provided or network request times out, the system uses cached meteorological observations or interactive manual-override sliders.
- **OpenStreetMap Overpass API:** Junction geometry, proximity to schools, hospitals, and lane counts are retrieved via Overpass QL and cached locally in `data/cached_osm.json` to guarantee sub-second queries and offline hackathon reliability.
- **Close-Call Definition (traffic-monitor inspired):** A close call is recorded when a vehicle trajectory and pedestrian bounding centroid fall within a 1.5-meter spatio-temporal conflict polygon with approach velocity $> 20$ km/h.

## 4. Public Alerts & Client Geofencing
- **Zero-Knowledge Client GPS:** The public mobile PWA fetches approved hotspot bounding radii (JSON payload). Spatial proximity checks (Haversine / Turf.js within ~300 meters) execute strictly in the client browser's Web Worker or UI thread. The device coordinates are never uploaded to the backend.
- **Cross-Platform Haptics & Voice:** The Web Vibration API (`navigator.vibrate([200, 100, 200])`) is supported primarily on Android Chrome; iOS Safari falls back to Web Speech Synthesis voice warnings and visual HUD pulsing.
