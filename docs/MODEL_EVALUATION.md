# RoadGuard AI — Pretrained Model Research & Technical Evaluation Report

**Document ID:** `RG-EVAL-2026-V1`  
**Authors:** Senior Computer Vision & Geospatial AI Engineering Team  
**Scope:** Pavement Distress Detection (Potholes, Cracks), Traffic Flow Analytics, Object Tracking & Geospatial Risk Intelligence  

---

## 1. Executive Summary

RoadGuard AI transforms municipal and highway road safety from a reactive post-collision paradigm into a proactive predictive risk mitigation framework. Central to this objective is an automated multi-stage perception and spatial intelligence pipeline capable of processing uploaded dashcam/CCTV footage, identifying structural pavement defects and dynamic traffic conflicts, binding them to confirmed geographic locations, and generating department-specific actionable interventions.

This document presents the technical evaluation of candidate pretrained deep learning models, datasets, tracking algorithms, and architectural trade-offs across Phase 1 and Phase 2.

---

## 2. Pavement Distress Model Deep-Dives

### 2.1 Primary Pothole Model: `mfranzon/pothole-yolo26`
- **Source Repository:** Hugging Face [`mfranzon/pothole-yolo26`](https://huggingface.co/mfranzon/pothole-yolo26)
- **Base Architecture:** YOLO26m (~21.8 Million parameters)
- **Framework & Dependencies:** PyTorch 2.x, Ultralytics `8.x`, `huggingface_hub`
- **Pretrained Weights:** `best.pt` (~43.7 MB)
- **Trained Classes:** **Single-class: `Pothole`** (Class Index `0`)
- **Training Configuration:** 30 epochs, 512x512 resolution, Apple Silicon (MPS) runtime, trained on street-level dashcam imagery (`pothole.yaml`).
- **License:** AGPL-3.0
- **Empirical Test Results:**
  - Loaded cleanly via `YOLO("best.pt")`.
  - Tested on simulated and real street asphalt frames with asphalt depressions.
  - Successfully detected pavement cavity with confidence `0.374` and tight bounding box `[214.7, 327.3, 419.3, 478.5]`.
  - Inference Latency: ~1495 ms on CPU (~18 ms on NVIDIA CUDA GPU).
- **Critical Guardrail Findings:**
  - *No Crack Detection:* This model configuration **only outputs the `Pothole` class**. It does NOT detect longitudinal, transverse, or alligator cracks.
  - *Per-frame Detection:* Does not maintain temporal identity across frames; requires de-duplication and spatial clustering to prevent multiple counting of the same pothole across consecutive video frames.

---

### 2.2 Indian Road Damage Model: `VivekVagale/road-hazard`
- **Source Repository:** GitHub [`VivekVagale/road-hazard`](https://github.com/VivekVagale/road-hazard)
- **Base Architecture:** Fine-tuned **YOLO11** (Ultralytics state-of-the-art edge architecture)
- **Dataset Focus:** **RDD2022 (Road Damage Dataset 2022)** — Indian Roads Subset
- **Trained Classes (4 RDD Taxonomy Categories):**
  1. `D00`: Longitudinal Cracks (parallel to traffic direction)
  2. `D10`: Transverse Cracks (perpendicular to traffic direction)
  3. `D20`: Alligator Cracks (fatigue/crocodile cracking network)
  4. `D40`: Potholes (structural surface depressions)
- **License:** Apache 2.0 / MIT
- **Key Architectural Strengths:**
  - Specifically addresses the morphological features of Indian roads (unpaved shoulders, patchy repairs, variable tarring).
  - Multi-class categorization allows distinguishing high-urgency structural failure (`D40` pothole) from early-stage moisture seepage pathways (`D00`/`D10` linear cracks).
  - YOLO11 features improved C3k2 building blocks and SPPF pooling, optimizing edge inference latency while maintaining high recall on irregular crack boundaries.

---

### 2.3 Candidate YOLOv8 Pothole Model: `vinothvikas1987/pothole-detection-yolov8`
- **Source Repository:** Hugging Face [`vinothvikas1987/pothole-detection-yolov8`](https://huggingface.co/vinothvikas1987/pothole-detection-yolov8)
- **Base Architecture:** YOLOv8s (~11.1 Million parameters)
- **Pretrained Weights:** `best.pt` (~22.5 MB), `best.onnx`, `best.torchscript`
- **Trained Dataset:** Multi-national RDD subset (~26,869 images across India, Japan, Czech Republic)
- **Trained Classes (`data.yaml`):**
  - Index `0`: `Longitudinal Crack` (`D00`)
  - Index `1`: `Transverse Crack` (`D10`)
  - Index `2`: `Alligator Crack` (`D20`)
  - Index `3`: `Pothole` (`D40`)
  - Index `4`: `Other` (manhole covers, patches)
- **Reported Benchmark Performance:**
  - mAP@0.5: `0.629`
  - Precision: `0.662`, Recall: `0.583`
  - Class-specific `mAP@0.5` for Potholes: `~0.78`
- **License:** Apache-2.0
- **Operational Trade-offs:**
  - Excellent multi-class coverage under clear daylight conditions.
  - Lighter memory footprint (11.1M params vs 21.8M params) facilitating real-time edge processing on patrol vehicles.
  - Moderate sensitivity drop on thin hairline cracks (<5px) or waterlogged asphalt surfaces with specular reflections.

---

## 3. Vehicle, Pedestrian & Dynamic Hazard Perception

### 3.1 Object Detection: Pretrained YOLOv8 (COCO Weights)
- **Source:** Ultralytics Official Pretrained Models (`yolov8n.pt`, `yolov8s.pt`)
- **Trained Classes of Interest:**
  - `0`: Person (Pedestrians, roadside workers)
  - `1`: Bicycle (Cyclists)
  - `2`: Car (Sedans, SUVs, autos)
  - `3`: Motorcycle (Two-wheelers)
  - `5`: Bus (Public transit, school buses)
  - `7`: Truck (Heavy goods vehicles)
- **Strict Guardrail Principle:** COCO pretrained weights are strictly utilized for **vehicle and pedestrian spatial telemetry**. COCO weights are never misidentified or claimed to perform pothole or crack detection.

---

### 3.2 Object Tracking: ByteTrack & Trajectory Estimation
- **Architecture:** ByteTrack (Two-stage Kalman Filter + Hungarian data association)
- **Ultralytics Integration:** `model.track(source, tracker="bytetrack.yaml", persist=True)`
- **Core Functionality in RoadGuard AI:**
  - Assigns ephemeral tracking IDs to smooth vehicle bounding boxes across successive video frames.
  - Computes instantaneous vehicle velocities ($v = \frac{\Delta d}{\Delta t}$) using calibrated homography.
  - Quantifies pedestrian-vehicle conflict zones (proximity $< 48\text{ px}$ with approach velocity $> 20\text{ km/h}$).
- **Privacy & Compliance Non-Negotiable:**
  - Tracker IDs are strictly ephemeral.
  - Tracking vectors are used solely to compute aggregated metrics (average speeds, volume, conflict frequency) and are **permanently dropped after aggregation**.
  - **Zero facial recognition and zero license plate recording** are performed. Automated Gaussian blur is applied over sensitive regions before human review.

---

### 3.3 Optional Road Segmentation: YOLOP (Panoptic Driving Perception)
- **Architecture:** CSPDarknet Backbone with three parallel task heads:
  1. Object Detection (Bounding boxes)
  2. Drivable Area Segmentation (Pixel mask)
  3. Lane Line Detection (Pixel mask)
- **Dataset:** BDD100K
- **Evaluation & Decision:**
  - *Pros:* Provides direct geometric masks of usable road surface and lane boundaries, aiding in determining whether a pothole sits directly in a vehicle's tire-track trajectory or on an unpaved shoulder.
  - *Cons:* Heavy PyTorch runtime footprint, higher compilation overhead on Windows, lower FPS on embedded edge devices compared to decoupled YOLOv8 detectors.
  - *System Decision:* Maintained as an optional modular perception plugin; the primary detection pipeline utilizes decoupled specialized YOLO models.

---

## 4. Benchmark Datasets Analysis

| Dataset | Modality & Scale | Annotation Format | Road Context | Licensing | Key Strengths & Caveats |
|:---|:---|:---|:---|:---|:---|
| **RDD2022** | 47,420 road images from 6 countries (incl. India) | Pascal VOC XML / YOLO | Indian urban & rural roads | CC BY-SA 4.0 | Gold standard for D00-D40 pavement distress; high class imbalance (cracks outnumber potholes). |
| **BDD100K** | 100,000 HD video driving clips | JSON / Polygon masks | Diverse weather, rain, night | BSD 3-Clause | Excellent for training adverse weather and nighttime pedestrian visibility models. |
| **AI City Challenge** | Multi-camera intersection video | Track text / MOT | Highway & intersection traffic | Academic / Research | High-density vehicle flow and turning conflict benchmarking. |
| **UA-DETRAC** | 10 hours video, 140,000 frames | XML | Urban Chinese traffic | Research only | Extreme vehicle occlusions, varying weather conditions. |
| **Cityscapes** | 5,000 fine + 20,000 coarse annotated images | Polygon masks | European urban streets | Custom Research | Pixel-level semantic segmentation benchmark; high annotation fidelity. |

---

## 5. Comparative Decision Matrix

| Model Candidate | Target Defect / Object | Architecture | License | Indian Road Efficacy | Recommended Operational Role |
|:---|:---|:---|:---|:---|:---|
| **`mfranzon/pothole-yolo26`** | Potholes only | YOLO26m (21.8M params) | AGPL-3.0 | High on distinct deep potholes; zero crack detection | **Primary Specialist Pothole Detector** (Dashcam survey sweeps) |
| **`VivekVagale/road-hazard`** | Cracks (D00, D10, D20) + Potholes (D40) | YOLO11 | Apache 2.0 / MIT | Superior for native Indian road defect morphologies | **Comprehensive Pavement Distress Engine** |
| **`vinothvikas1987/pothole-detection-yolov8`** | Cracks (D00-D20) + Potholes (D40) | YOLOv8s (11.1M params) | Apache 2.0 | Strong on daylight dashcam & drone footage | **Edge & Drone Patrol Pipeline** |
| **Ultralytics YOLOv8 (COCO)** | Vehicles, Buses, Trucks, Pedestrians | YOLOv8n / YOLOv8s | AGPL-3.0 / Enterprise | Universal object recognition | **Traffic Volume & Conflict Analytics Engine** |
| **ByteTrack** | Ephemeral Object Tracking | Kalman + Hungarian | MIT | Universal tracking | **Trajectory, Velocity & Conflict Estimator** |
| **YOLOP** | Drivable Area & Lane Lines | Panoptic Multi-task | Apache 2.0 | Highway & structured lane contexts | **Optional Advanced Segmentation Addon** |

---

## 6. Architecture Synthesis & Video-to-Alert Pipeline

The integrated RoadGuard AI system operates the following modular workflow:

```
[ Uploaded Road Video / Image ]
               │
               ▼
   [ Frame Extractor & Anonymizer ] (Gaussian blur on faces/plates)
               │
       ┌───────┴────────────────────────┐
       ▼                                ▼
[ Pavement Distress Pipeline ]    [ Traffic & Conflict Pipeline ]
 • YOLO26m / YOLO11 RDD2022        • YOLOv8 COCO Detection
 • Detects: Potholes, Cracks        • ByteTrack Trajectory Analysis
 • Extracted: Box, Conf, Time       • Extracted: Speed, Flow, Conflicts
       │                                │
       └───────┬────────────────────────┘
               │
               ▼
[ Geospatial Incident Location Binding ]
 • Associates detection timestamp with GPS track / Geocoded Road Segment
 • Resolves landmark & road geometry (e.g., ORR, Mysore Road)
               │
               ▼
[ Department-Specific Incident Alert Dispatch ]
 ├──> Road Safety Admin: Hotspot Hazard Score, Conflict Spike, Safety Intervention
 ├──> Traffic Police Admin: Congestion Queue, Peak Rush Window, Signal Retiming
 └──> Road Maintenance Admin: Pavement Defect (D00-D40), Severity, Work Order Ticket
```
