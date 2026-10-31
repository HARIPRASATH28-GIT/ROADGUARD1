import os
import json
import sqlite3
from typing import List, Dict, Any, Optional
from backend.app.config import settings

DB_FILE = os.path.join(settings.DATA_DIR, "roadguard.db")

class Database:
    def __init__(self):
        self._init_sqlite()
        self._load_seed_data()

    def get_connection(self):
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_sqlite(self):
        os.makedirs(settings.DATA_DIR, exist_ok=True)
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Hotspots table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS hotspots (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                junction_type TEXT,
                road_type TEXT,
                lanes INTEGER,
                distance_to_school_m REAL,
                school_name TEXT,
                distance_to_hospital_m REAL,
                hospital_name TEXT,
                status TEXT NOT NULL,
                approved_by TEXT,
                approved_at TEXT,
                rejection_reason TEXT,
                current_risk_score REAL,
                current_risk_class TEXT,
                current_congestion TEXT,
                public_warning_tag TEXT,
                responsible_body TEXT,
                data_json TEXT NOT NULL
            );
            """)

            # Road damages table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS damages (
                id TEXT PRIMARY KEY,
                hotspot_id TEXT,
                damage_type TEXT,
                damage_code TEXT,
                description TEXT,
                severity INTEGER,
                priority_score REAL,
                lat REAL,
                lng REAL,
                responsible_body TEXT,
                assigned_contractor TEXT,
                work_order_status TEXT,
                work_order_id TEXT,
                reported_at TEXT,
                dispatched_at TEXT,
                target_completion TEXT,
                rescan_verified INTEGER,
                data_json TEXT NOT NULL
            );
            """)

            # Audit logs
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                actor TEXT NOT NULL,
                role TEXT NOT NULL,
                action TEXT NOT NULL,
                target_id TEXT,
                details TEXT
            );
            """)

            # Simulations history
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS simulation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hotspot_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                risk_score REAL NOT NULL,
                latency_ms REAL NOT NULL,
                params_json TEXT NOT NULL
            );
            """)

            # Seeded Agency Users Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                full_name TEXT NOT NULL,
                department TEXT,
                created_at TEXT NOT NULL
            );
            """)

            # Geospatial Incidents Table (Video / Dashcam findings bound to confirmed GPS)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                video_name TEXT,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                road_name TEXT NOT NULL,
                landmark TEXT,
                road_segment_id TEXT,
                location_confirmed INTEGER DEFAULT 0,
                risk_score REAL NOT NULL,
                risk_class TEXT NOT NULL,
                potholes_count INTEGER DEFAULT 0,
                cracks_count INTEGER DEFAULT 0,
                vehicles_count INTEGER DEFAULT 0,
                conflicts_count INTEGER DEFAULT 0,
                analyzed_at TEXT NOT NULL,
                evidence_json TEXT NOT NULL
            );
            """)

            # Department Specific Alerts Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS department_alerts (
                id TEXT PRIMARY KEY,
                incident_id TEXT NOT NULL,
                department TEXT NOT NULL,
                severity TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                recommended_action TEXT NOT NULL,
                status TEXT DEFAULT 'ACTIVE',
                created_at TEXT NOT NULL,
                payload_json TEXT NOT NULL
            );
            """)

            # Road Segments Table (Hazard-coded Corridors for Map)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS road_segments (
                id TEXT PRIMARY KEY,
                corridor_name TEXT NOT NULL,
                hazard_level TEXT NOT NULL,
                speed_limit_kmh INTEGER NOT NULL,
                avg_daily_traffic INTEGER,
                pothole_density_km REAL,
                geometry_json TEXT NOT NULL
            );
            """)

            conn.commit()

    def _load_seed_data(self):
        import bcrypt
        import datetime
        # Seed hotspots if table empty
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM hotspots")
            if cursor.fetchone()[0] == 0:
                hotspots_file = os.path.join(settings.DATA_DIR, "hotspots.json")
                if os.path.exists(hotspots_file):
                    with open(hotspots_file, "r") as f:
                        hotspots = json.load(f)
                        for h in hotspots:
                            cursor.execute("""
                            INSERT INTO hotspots (
                                id, name, lat, lng, junction_type, road_type, lanes,
                                distance_to_school_m, school_name, distance_to_hospital_m, hospital_name,
                                status, approved_by, approved_at, rejection_reason,
                                current_risk_score, current_risk_class, current_congestion,
                                public_warning_tag, responsible_body, data_json
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                h["id"], h["name"], h["lat"], h["lng"], h["junction_type"],
                                h["road_type"], h["lanes"], h["distance_to_school_m"],
                                h["school_name"], h["distance_to_hospital_m"], h["hospital_name"],
                                h["status"], h.get("approved_by"), h.get("approved_at"),
                                h.get("rejection_reason"), h["current_risk_score"],
                                h["current_risk_class"], h["current_congestion"],
                                h.get("public_warning_tag", "Caution"),
                                h.get("responsible_body", "Municipal Authority"),
                                json.dumps(h)
                            ))

            # Seed damages if table empty
            cursor.execute("SELECT COUNT(*) FROM damages")
            if cursor.fetchone()[0] == 0:
                damages_file = os.path.join(settings.DATA_DIR, "sample_damages.json")
                if os.path.exists(damages_file):
                    with open(damages_file, "r") as f:
                        damages = json.load(f)
                        for d in damages:
                            cursor.execute("""
                            INSERT INTO damages (
                                id, hotspot_id, damage_type, damage_code, description,
                                severity, priority_score, lat, lng, responsible_body,
                                assigned_contractor, work_order_status, work_order_id,
                                reported_at, dispatched_at, target_completion,
                                rescan_verified, data_json
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                d["id"], d.get("hotspot_id"), d["damage_type"], d["damage_code"],
                                d["description"], d["severity"], d["priority_score"],
                                d["lat"], d["lng"], d["responsible_body"],
                                d.get("assigned_contractor"), d["work_order_status"],
                                d.get("work_order_id"), d["reported_at"],
                                d.get("dispatched_at"), d.get("target_completion"),
                                1 if d.get("rescan_verified") else 0,
                                json.dumps(d)
                            ))
            # Seed users if table empty
            cursor.execute("SELECT COUNT(*) FROM users")
            if cursor.fetchone()[0] == 0:
                seed_users_file = os.path.join(settings.DATA_DIR, "seed_users.json")
                if os.path.exists(seed_users_file):
                    with open(seed_users_file, "r") as f:
                        users = json.load(f)
                        for u in users:
                            plain = u.get("password_plain", "hari")
                            salt = bcrypt.gensalt(rounds=12)
                            pwd_hash = bcrypt.hashpw(plain.encode('utf-8'), salt).decode('utf-8')
                            now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
                            cursor.execute("""
                            INSERT INTO users (id, email, password_hash, role, full_name, department, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                            """, (u["id"], u["email"].lower(), pwd_hash, u["role"], u["full_name"], u.get("department", "Agency Command"), now_str))

            # Seed road segments if empty
            cursor.execute("SELECT COUNT(*) FROM road_segments")
            if cursor.fetchone()[0] == 0:
                seed_segments = [
                    {
                        "id": "SEG-001",
                        "corridor_name": "Outer Ring Road (Silk Board to HSR Sector 2)",
                        "hazard_level": "CRITICAL",
                        "speed_limit_kmh": 45,
                        "avg_daily_traffic": 98400,
                        "pothole_density_km": 4.8,
                        "geometry": [[12.9176, 77.6238], [12.9150, 77.6320], [12.9120, 77.6410], [12.9110, 77.6480]]
                    },
                    {
                        "id": "SEG-002",
                        "corridor_name": "Bellary Road (Hebbal Flyover to Kodigehalli Gate)",
                        "hazard_level": "HIGH",
                        "speed_limit_kmh": 60,
                        "avg_daily_traffic": 76200,
                        "pothole_density_km": 2.9,
                        "geometry": [[13.0358, 77.5970], [13.0450, 77.5950], [13.0580, 77.5940], [13.0720, 77.5920]]
                    },
                    {
                        "id": "SEG-003",
                        "corridor_name": "Old Madras Road (KR Puram Cable Bridge to Tin Factory)",
                        "hazard_level": "CRITICAL",
                        "speed_limit_kmh": 40,
                        "avg_daily_traffic": 84100,
                        "pothole_density_km": 6.2,
                        "geometry": [[12.9982, 77.6926], [12.9960, 77.7020], [12.9920, 77.7120], [12.9880, 77.7250]]
                    },
                    {
                        "id": "SEG-004",
                        "corridor_name": "Mysore Road (Satellite Bus Station to Deepanjali Nagar)",
                        "hazard_level": "HIGH",
                        "speed_limit_kmh": 35,
                        "avg_daily_traffic": 68900,
                        "pothole_density_km": 3.7,
                        "geometry": [[12.9562, 77.5452], [12.9520, 77.5380], [12.9480, 77.5310], [12.9430, 77.5250]]
                    },
                    {
                        "id": "SEG-005",
                        "corridor_name": "Tumkur Road (Goraguntepalya to Peenya 1st Stage)",
                        "hazard_level": "MEDIUM",
                        "speed_limit_kmh": 50,
                        "avg_daily_traffic": 61500,
                        "pothole_density_km": 1.8,
                        "geometry": [[13.0285, 77.5407], [13.0340, 77.5340], [13.0410, 77.5270], [13.0490, 77.5200]]
                    },
                    {
                        "id": "SEG-006",
                        "corridor_name": "Indiranagar 100ft Road Corridor",
                        "hazard_level": "LOW",
                        "speed_limit_kmh": 40,
                        "avg_daily_traffic": 42000,
                        "pothole_density_km": 0.4,
                        "geometry": [[12.9784, 77.6408], [12.9720, 77.6415], [12.9650, 77.6420]]
                    }
                ]
                for seg in seed_segments:
                    cursor.execute("""
                    INSERT INTO road_segments (id, corridor_name, hazard_level, speed_limit_kmh, avg_daily_traffic, pothole_density_km, geometry_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        seg["id"], seg["corridor_name"], seg["hazard_level"], seg["speed_limit_kmh"],
                        seg["avg_daily_traffic"], seg["pothole_density_km"], json.dumps(seg["geometry"])
                    ))

            # Seed demo incidents and department alerts if empty
            cursor.execute("SELECT COUNT(*) FROM incidents")
            if cursor.fetchone()[0] == 0:
                demo_incidents = [
                    {
                        "id": "INC-2026-001",
                        "title": "Severe Cavity & Conflict Zone at Silk Board Central Junction",
                        "video_name": "silkboard_dashcam_rush.mp4",
                        "lat": 12.9176,
                        "lng": 77.6238,
                        "road_name": "Outer Ring Road (Hosur Rd Flyover Entry)",
                        "landmark": "Near Central Silk Board Bus Stop #3",
                        "road_segment_id": "SEG-001",
                        "location_confirmed": 1,
                        "risk_score": 88.5,
                        "risk_class": "CRITICAL",
                        "potholes_count": 3,
                        "cracks_count": 5,
                        "vehicles_count": 84,
                        "conflicts_count": 7,
                        "analyzed_at": "2026-10-31T08:30:00Z",
                        "evidence": {
                            "top_detected_classes": ["D40 Pothole (0.88)", "D20 Alligator Crack (0.76)", "Pedestrian Conflict (7 events)"],
                            "avg_speed_kmh": 18.5,
                            "queue_length_m": 72.0,
                            "weather_context": "Light Drizzle, Wet Asphalt",
                            "visibility_index": "Fair (68%)"
                        }
                    },
                    {
                        "id": "INC-2026-002",
                        "title": "High-Speed Transition & Pavement Fatigue at Hebbal Ramp",
                        "video_name": "hebbal_airport_merge.mp4",
                        "lat": 13.0358,
                        "lng": 77.5970,
                        "road_name": "Bellary Road Flyover Merge",
                        "landmark": "Opposite Baptist Hospital Pedestrian Crossing",
                        "road_segment_id": "SEG-002",
                        "location_confirmed": 1,
                        "risk_score": 74.2,
                        "risk_class": "HIGH",
                        "potholes_count": 1,
                        "cracks_count": 4,
                        "vehicles_count": 68,
                        "conflicts_count": 3,
                        "analyzed_at": "2026-10-31T09:15:00Z",
                        "evidence": {
                            "top_detected_classes": ["D10 Transverse Crack (0.82)", "D40 Pothole (0.71)", "Sudden Swerving (4 events)"],
                            "avg_speed_kmh": 46.0,
                            "queue_length_m": 35.0,
                            "weather_context": "Clear, High Glare",
                            "visibility_index": "Good (89%)"
                        }
                    }
                ]
                for inc in demo_incidents:
                    cursor.execute("""
                    INSERT INTO incidents (
                        id, title, video_name, lat, lng, road_name, landmark, road_segment_id,
                        location_confirmed, risk_score, risk_class, potholes_count, cracks_count,
                        vehicles_count, conflicts_count, analyzed_at, evidence_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        inc["id"], inc["title"], inc["video_name"], inc["lat"], inc["lng"],
                        inc["road_name"], inc["landmark"], inc["road_segment_id"],
                        inc["location_confirmed"], inc["risk_score"], inc["risk_class"],
                        inc["potholes_count"], inc["cracks_count"], inc["vehicles_count"],
                        inc["conflicts_count"], inc["analyzed_at"], json.dumps(inc["evidence"])
                    ))

                demo_alerts = [
                    # Road Safety alerts
                    {
                        "id": "ALT-SAF-001",
                        "incident_id": "INC-2026-001",
                        "department": "safety",
                        "severity": "CRITICAL",
                        "title": "Critical Pedestrian Conflict Zone Detected",
                        "message": "7 close-call pedestrian interactions recorded near Silk Board bus stop with swerving vehicles avoiding central potholes.",
                        "recommended_action": "Sanction raised tabletop pedestrian crosswalk with solar blinkers (IRC:SP:99).",
                        "created_at": "2026-10-31T08:31:00Z"
                    },
                    # Traffic Police alerts
                    {
                        "id": "ALT-TRF-001",
                        "incident_id": "INC-2026-001",
                        "department": "traffic",
                        "severity": "HIGH",
                        "title": "Bottleneck & Lane Capacity Drop",
                        "message": "Vehicle queue stretched to 72m due to lane pinching at ORR entry. Average flow slowed to 18.5 km/h.",
                        "recommended_action": "Dispatch Sector-2 traffic marshals to channelize 2 lanes; retime Hosur Road green signal +18 seconds.",
                        "created_at": "2026-10-31T08:31:00Z"
                    },
                    # Road Maintenance alerts
                    {
                        "id": "ALT-MNT-001",
                        "incident_id": "INC-2026-001",
                        "department": "maintenance",
                        "severity": "CRITICAL",
                        "title": "Pavement Deep Depression & Alligator Cracking",
                        "message": "3 D40 Potholes (>75mm depth) and structural fatigue network (D20) in primary wheel path.",
                        "recommended_action": "Issue emergency BBMP work order WO-MNT-4819: Cold-mix asphalt mill-and-fill within 24 hours.",
                        "created_at": "2026-10-31T08:31:00Z"
                    }
                ]
                for alt in demo_alerts:
                    cursor.execute("""
                    INSERT INTO department_alerts (
                        id, incident_id, department, severity, title, message,
                        recommended_action, status, created_at, payload_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
                    """, (
                        alt["id"], alt["incident_id"], alt["department"], alt["severity"],
                        alt["title"], alt["message"], alt["recommended_action"],
                        alt["created_at"], json.dumps(alt)
                    ))

            conn.commit()

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None

    def get_all_hotspots(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT data_json FROM hotspots")
            rows = cursor.fetchall()
            return [json.loads(row["data_json"]) for row in rows]

    def get_hotspot_by_id(self, hotspot_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT data_json FROM hotspots WHERE id = ?", (hotspot_id,))
            row = cursor.fetchone()
            if row:
                return json.loads(row["data_json"])
            return None

    def update_hotspot(self, hotspot_id: str, updated_data: Dict[str, Any]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE hotspots SET
                status = ?,
                approved_by = ?,
                approved_at = ?,
                rejection_reason = ?,
                current_risk_score = ?,
                current_risk_class = ?,
                current_congestion = ?,
                public_warning_tag = ?,
                data_json = ?
            WHERE id = ?
            """, (
                updated_data["status"],
                updated_data.get("approved_by"),
                updated_data.get("approved_at"),
                updated_data.get("rejection_reason"),
                updated_data.get("current_risk_score"),
                updated_data.get("current_risk_class"),
                updated_data.get("current_congestion"),
                updated_data.get("public_warning_tag"),
                json.dumps(updated_data),
                hotspot_id
            ))
            conn.commit()

    def get_all_damages(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT data_json FROM damages ORDER BY priority_score DESC")
            rows = cursor.fetchall()
            return [json.loads(row["data_json"]) for row in rows]

    def update_damage(self, damage_id: str, updated_data: Dict[str, Any]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE damages SET
                work_order_status = ?,
                assigned_contractor = ?,
                rescan_verified = ?,
                data_json = ?
            WHERE id = ?
            """, (
                updated_data["work_order_status"],
                updated_data.get("assigned_contractor"),
                1 if updated_data.get("rescan_verified") else 0,
                json.dumps(updated_data),
                damage_id
            ))
            conn.commit()

    def log_audit(self, actor: str, role: str, action: str, target_id: str, details: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            import datetime
            cursor.execute("""
            INSERT INTO audit_logs (timestamp, actor, role, action, target_id, details)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (
                datetime.datetime.now(datetime.timezone.utc).isoformat(),
                actor, role, action, target_id, details
            ))
            conn.commit()

    def log_simulation(self, hotspot_id: str, risk_score: float, latency_ms: float, params: Dict[str, Any]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            import datetime
            cursor.execute("""
            INSERT INTO simulation_history (hotspot_id, timestamp, risk_score, latency_ms, params_json)
            VALUES (?, ?, ?, ?, ?)
            """, (
                hotspot_id,
                datetime.datetime.now(datetime.timezone.utc).isoformat(),
                risk_score,
                latency_ms,
                json.dumps(params)
            ))
            conn.commit()

    # --- Incident Location Intelligence & Geospatial Hazards ---
    def create_incident(self, incident: Dict[str, Any]) -> str:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO incidents (
                id, title, video_name, lat, lng, road_name, landmark, road_segment_id,
                location_confirmed, risk_score, risk_class, potholes_count, cracks_count,
                vehicles_count, conflicts_count, analyzed_at, evidence_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                incident["id"], incident["title"], incident.get("video_name"),
                float(incident["lat"]), float(incident["lng"]), incident["road_name"],
                incident.get("landmark"), incident.get("road_segment_id"),
                1 if incident.get("location_confirmed") else 0,
                float(incident["risk_score"]), incident["risk_class"],
                int(incident.get("potholes_count", 0)), int(incident.get("cracks_count", 0)),
                int(incident.get("vehicles_count", 0)), int(incident.get("conflicts_count", 0)),
                incident["analyzed_at"], json.dumps(incident.get("evidence", {}))
            ))
            conn.commit()
            return incident["id"]

    def get_all_incidents(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM incidents ORDER BY analyzed_at DESC")
            rows = cursor.fetchall()
            results = []
            for r in rows:
                item = dict(r)
                item["evidence"] = json.loads(item["evidence_json"])
                del item["evidence_json"]
                results.append(item)
            return results

    def get_incident_by_id(self, incident_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
            row = cursor.fetchone()
            if row:
                item = dict(row)
                item["evidence"] = json.loads(item["evidence_json"])
                del item["evidence_json"]
                return item
            return None

    def update_incident_location(self, incident_id: str, lat: float, lng: float, road_name: str, landmark: str = None, confirmed: bool = True):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE incidents SET
                lat = ?,
                lng = ?,
                road_name = ?,
                landmark = coalesce(?, landmark),
                location_confirmed = ?
            WHERE id = ?
            """, (lat, lng, road_name, landmark, 1 if confirmed else 0, incident_id))
            conn.commit()

    def create_department_alert(self, alert: Dict[str, Any]) -> str:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO department_alerts (
                id, incident_id, department, severity, title, message,
                recommended_action, status, created_at, payload_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                alert["id"], alert["incident_id"], alert["department"], alert["severity"],
                alert["title"], alert["message"], alert["recommended_action"],
                alert.get("status", "ACTIVE"), alert["created_at"], json.dumps(alert)
            ))
            conn.commit()
            return alert["id"]

    def get_alerts_by_department(self, department: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if department and department.lower() != 'all':
                cursor.execute("SELECT * FROM department_alerts WHERE department = ? ORDER BY created_at DESC", (department.lower(),))
            else:
                cursor.execute("SELECT * FROM department_alerts ORDER BY created_at DESC")
            rows = cursor.fetchall()
            results = []
            for r in rows:
                item = dict(r)
                item["payload"] = json.loads(item["payload_json"])
                del item["payload_json"]
                results.append(item)
            return results

    def update_alert_status(self, alert_id: str, status: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE department_alerts SET status = ? WHERE id = ?", (status, alert_id))
            conn.commit()

    def get_road_segments(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM road_segments")
            rows = cursor.fetchall()
            results = []
            for r in rows:
                item = dict(r)
                item["geometry"] = json.loads(item["geometry_json"])
                del item["geometry_json"]
                results.append(item)
            return results

db = Database()
