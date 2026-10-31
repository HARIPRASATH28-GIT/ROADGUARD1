# RoadGuard AI - Third-Party Licences & Reference Attributions

| Project / Library | Reference URL | Licence | Role & Usage in RoadGuard AI | Compliance Notes |
|:---|:---|:---|:---|:---|
| **RoadDamageDetection** | `https://github.com/oracl4/RoadDamageDetection` | MIT / Apache 2.0 | YOLOv8 road damage detector architectural pattern (RDD2022 dataset adaptation) | Adopted damage classification ontology (D00-D40) and priority scoring. Clean-room implementation. |
| **RoadDamageDetector (RDD2022)** | `https://github.com/sekilab/RoadDamageDetector` | CC BY-SA 4.0 | Multi-national road damage dataset schema (including Indian road subset) | Reference taxonomy for pothole, alligator crack, longitudinal crack categorizations. |
| **traffic-monitor** | `https://github.com/glossyio/traffic-monitor` | MIT | Zone-based pedestrian/vehicle conflict detection logic | Polygon overlap and close-call counter adapted for spatial hazard quantification without driver tracking. |
| **AutoVision** | `https://github.com/DAJ-works/AutoVision` | MIT | Video processing pipeline structure (OpenCV + YOLOv8 + ByteTrack speed aggregates) | **Strict Guardrail applied:** Fault-determination and driver-blame logic were explicitly rejected and purged. Used solely for aggregated flow statistics. |
| **pothole-reporter** | `https://github.com/coding-parrot/pothole-reporter` | MIT | Municipal work order workflow & damage-to-authority dispatch | Pattern for generating structured maintenance repair tickets with thumbnail and severity. |
| **Ultralytics YOLOv8** | `https://github.com/ultralytics/ultralytics` | AGPL-3.0 / Enterprise | Real-time object detection (pedestrians, vehicles, cyclists) | Built-in ByteTrack used for temporal frame aggregation only. Anonymization blur filter applied before rendering. |
| **OpenStreetMap & Overpass** | `https://www.openstreetmap.org/` | ODbL 1.0 | Geographic infrastructure, school, hospital, and junction topology queries | Cached locally; proper OSM copyright and attribution maintained. |
| **OpenWeatherMap API** | `https://openweathermap.org/api` | API Terms | Meteorological telemetry (rainfall mm, wind speed, visibility index) | Cached fallback implemented for offline reliability. |
| **SHAP** | `https://github.com/shap/shap` | MIT | TreeSHAP explainer for XGBoost model predictions | Computes exact local feature attribution values per factor. |
| **FastAPI** | `https://github.com/tiangolo/fastapi` | MIT | High-performance asynchronous REST backend API | Powers real-time recalculations and role-based endpoints. |
| **React & Vite** | `https://github.com/vitejs/vite` | MIT | Modern fast frontend foundation and reactive UI components | Interactive interfaces for officers, police, maintenance, and public PWA. |
| **Leaflet & React-Leaflet** | `https://github.com/Leaflet/Leaflet` | BSD-2-Clause | Interactive geospatial maps with custom SVG markers and risk heat zones | Clean mapping without heavy proprietary key requirements. |
| **pothole-yolo26 (mfranzon)** | `https://huggingface.co/mfranzon/pothole-yolo26` | AGPL-3.0 | Specialized single-class pothole detector (YOLO26m architecture) | Evaluated for dashcam pavement depression sweeps. Verified single class only (Pothole). |
| **road-hazard (VivekVagale)** | `https://github.com/VivekVagale/road-hazard` | Apache 2.0 / MIT | YOLO11 Indian road damage detection (RDD2022 subset) | Multi-class damage ontology for Indian road surface distress (D00, D10, D20, D40). |
| **pothole-detection-yolov8 (vinothvikas1987)** | `https://huggingface.co/vinothvikas1987/pothole-detection-yolov8` | Apache-2.0 | YOLOv8s fine-tuned on RDD dataset for cracks & potholes | Multi-class pavement distress evaluation (Longitudinal, Transverse, Alligator, Pothole). |
| **ByteTrack** | `https://github.com/FoundationVision/ByteTrack` | MIT | Real-time multi-object tracking for traffic flow & conflicts | Ephemeral tracking IDs dropped after velocity and volume aggregation. |
| **YOLOP** | `https://github.com/hustvl/YOLOP` | Apache 2.0 | Panoptic driving perception (drivable area & lane line detection) | Evaluated as optional modular plugin for drivable surface segmentation. |
| **BDD100K** | `https://www.vis.xyz/bdd100k/` | BSD 3-Clause | Large-scale driving video dataset under adverse weather/night | Reference baseline for environmental conditions and pedestrian visibility index. |
| **AI City Challenge** | `https://www.aicitychallenge.org/` | Research Use | Multi-camera intersection and highway traffic analytics | Reference for turn conflict and queue congestion benchmarks. |
| **UA-DETRAC** | `https://detrac-db.rit.albany.edu/` | Research Use | Multi-vehicle detection and tracking benchmark | Used for evaluation of occlusion handling in dense urban corridors. |
| **Cityscapes** | `https://www.cityscapes-dataset.com/` | Custom Research | Pixel-level semantic segmentation dataset for urban street scenes | Baseline for drivable roadway and sidewalk boundary definitions. |
