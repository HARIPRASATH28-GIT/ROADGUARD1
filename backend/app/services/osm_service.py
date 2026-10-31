import os
import json
import logging
import requests
from typing import Dict, Any, Optional
from backend.app.config import settings

logger = logging.getLogger(__name__)

class OSMService:
    def __init__(self):
        self.cache_file = os.path.join(settings.DATA_DIR, "cached_osm.json")
        self._cache = self._load_cache()

    def _load_cache(self) -> Dict[str, Any]:
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, "r") as f:
                    return json.load(f).get("nodes", {})
            except Exception as e:
                logger.warning(f"Failed to load cached OSM: {e}")
        return {}

    def get_junction_context(self, hotspot_id: str, lat: float, lng: float) -> Dict[str, Any]:
        """
        Retrieves junction geometry, lane count, proximity to schools and hospitals.
        Uses local cached data first to ensure sub-second response times and offline resilience.
        """
        if hotspot_id in self._cache:
            data = self._cache[hotspot_id]
            return {
                "source": "OSM_OVERPASS_CACHED",
                "lanes": data.get("lanes", 4),
                "highway_type": data.get("highway", "primary"),
                "junction_class": data.get("junction", "traffic_signals"),
                "speed_limit_kmh": int(data.get("maxspeed", 50)),
                "schools": data.get("schools_within_500m", []),
                "hospitals": data.get("hospitals_within_500m", [])
            }

        # Dynamic query fallback if not cached
        overpass_query = f"""
        [out:json][timeout:5];
        (
          node["amenity"="school"](around:600,{lat},{lng});
          node["amenity"="hospital"](around:600,{lat},{lng});
          way["highway"](around:50,{lat},{lng});
        );
        out body;
        """
        try:
            resp = requests.post(settings.OVERPASS_API_URL, data={"data": overpass_query}, timeout=3)
            if resp.status_code == 200:
                results = resp.json().get("elements", [])
                schools = []
                hospitals = []
                lanes = 4
                for el in results:
                    tags = el.get("tags", {})
                    if tags.get("amenity") == "school":
                        schools.append({"name": tags.get("name", "School"), "lat": el["lat"], "lng": el["lon"]})
                    elif tags.get("amenity") == "hospital":
                        hospitals.append({"name": tags.get("name", "Hospital"), "lat": el["lat"], "lng": el["lon"]})
                    if "lanes" in tags:
                        try:
                            lanes = int(tags["lanes"])
                        except ValueError:
                            pass
                return {
                    "source": "OSM_OVERPASS_LIVE",
                    "lanes": lanes,
                    "schools": schools,
                    "hospitals": hospitals
                }
        except Exception as e:
            logger.info(f"Overpass live query skipped, using default geometry: {e}")

        return {
            "source": "GEOMETRY_DEFAULT",
            "lanes": 4,
            "highway_type": "primary",
            "schools": [],
            "hospitals": []
        }

osm_service = OSMService()
