# RoadGuard AI - System Architecture

```mermaid
graph TD
    subgraph INPUT ["1. INPUT SENSORS & OBSERVATIONS"]
        CAM["Traffic Camera Feeds<br/>(OpenCV Video Streams)"]
        RAD["Radar / Speed Sensors<br/>(Telemetry Logs)"]
        WTH["Meteorological Telemetry<br/>(OpenWeather / Fallback)"]
        GEO["Geospatial Infrastructure<br/>(OpenStreetMap Overpass)"]
    end

    subgraph AI_PIPELINE ["2. AI & VISION AGGREGATION"]
        YOLO["YOLOv8 + ByteTrack<br/>(Vehicles, Pedestrians, RDD Defects)"]
        PRIVACY["Privacy Filter<br/>(Face & Plate Blur, Purge Tracker IDs)"]
        ZONE["Zone Conflict Logic<br/>(traffic-monitor Polygon Overlap)"]
        BRIGHT["OpenCV Photometry<br/>(Brightness & RMS Contrast)"]
        XGB["XGBoost Risk Regressor<br/>(0-100 Risk & Congestion Class)"]
        SHAP_EXP["TreeSHAP Explainer<br/>(Local Feature Attribution)"]
    end

    subgraph TOOLS ["3. TOOLS & INTEGRATIONS"]
        RULES["Rules Engine<br/>(IRC:99 & FHWA Countermeasures)"]
        WEATHER_SRV["Weather Service<br/>(API + Manual Override)"]
        OSM_SRV["OSM Geometry Service<br/>(Local Cache + Overpass)"]
        GROUND_CHK["Anti-Hallucination Service<br/>(Groundedness Verification)"]
    end

    subgraph DATA_STORE ["4. DATA & KNOWLEDGE LAYER"]
        SQLITE[("SQLite Database<br/>(Hotspots, Damages, Audit Logs)")]
        DATA_HOTSPOTS["hotspots.json<br/>(Baseline vs Post Metrics)"]
        DATA_DAMAGES["sample_damages.json<br/>(RDD2022 Work Orders)"]
        DATA_RULES["interventions_rules.json<br/>(IRC Guidelines)"]
    end

    subgraph HUMAN_CONTROL ["5. HUMAN-IN-THE-LOOP APPROVAL GATE"]
        OFFICER["Road Safety Officer<br/>(Console Review & Slider Adaptation)"]
        POLICE["Traffic Police<br/>(Tactical Signal & Staff Dispatch)"]
        MAINT["Road Maintenance<br/>(Work Orders & Laser Re-Scan)"]
        AUDIT["Immutable Audit Log<br/>(Sign-offs, Rejections)"]
    end

    subgraph OUTPUT ["6. CITIZEN & FIELD OUTPUT"]
        PUBLIC_PWA["Public Safety PWA<br/>(On-Device Geofence &lt; 300m)"]
        VOICE_HAPTIC["Web Speech &amp; Haptics<br/>(Zero-Knowledge Warning)"]
        CREW["Field Road Crew<br/>(Asphalt Patching & Re-scan)"]
    end

    %% Connections
    CAM --> YOLO
    RAD --> PRIVACY
    WTH --> WEATHER_SRV
    GEO --> OSM_SRV

    YOLO --> PRIVACY
    PRIVACY --> ZONE
    PRIVACY --> BRIGHT
    ZONE --> XGB
    BRIGHT --> XGB
    OSM_SRV --> XGB
    WEATHER_SRV --> XGB

    XGB --> SHAP_EXP
    SHAP_EXP --> RULES
    RULES --> GROUND_CHK

    GROUND_CHK --> SQLITE
    SQLITE <--> DATA_HOTSPOTS
    SQLITE <--> DATA_DAMAGES
    DATA_RULES --> RULES

    SQLITE --> OFFICER
    SQLITE --> POLICE
    SQLITE --> MAINT

    OFFICER --> AUDIT
    POLICE --> AUDIT
    MAINT --> AUDIT

    AUDIT --"Approved Only"--> PUBLIC_PWA
    PUBLIC_PWA --> VOICE_HAPTIC
    MAINT --> CREW
```

## Architectural Tenets
1. **Unidirectional Privacy Pipeline:** Sensor streams discard tracking IDs immediately after window aggregation. No facial images or license plates ever persist in the database.
2. **Grounded Explanations:** Every prediction is decomposed via TreeSHAP and verified against computed sensor evidence. Unsupported claims default to `"insufficient evidence"`.
3. **Strict Approval Gate:** Unapproved hotspots cannot be queried by the public client under any condition.
