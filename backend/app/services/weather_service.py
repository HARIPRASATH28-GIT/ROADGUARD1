import logging
import requests
from typing import Dict, Any
from backend.app.config import settings

logger = logging.getLogger(__name__)

class WeatherService:
    def __init__(self):
        self._manual_override = False
        self._cached_weather = {
            "condition": "Clear / Sunny",
            "rain_intensity_mmh": 0.0,
            "visibility_meters": 6500.0,
            "wind_speed_kmh": 12.0,
            "source": "CACHED_MOCK_FALLBACK"
        }

    def set_manual_override(self, rain: float, visibility: float, condition: str = "Manual Preset"):
        self._manual_override = True
        self._cached_weather = {
            "condition": condition,
            "rain_intensity_mmh": float(rain),
            "visibility_meters": float(visibility),
            "wind_speed_kmh": 14.0,
            "source": "MANUAL_SLIDER_OVERRIDE"
        }

    def clear_manual_override(self):
        self._manual_override = False

    def get_weather(self, lat: float = 12.9716, lng: float = 77.5946) -> Dict[str, Any]:
        """
        Retrieves weather telemetry.
        Precedence: Manual Override > OpenWeather API > Cached fallback.
        """
        if self._manual_override:
            return self._cached_weather

        if settings.OPENWEATHER_API_KEY:
            try:
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={settings.OPENWEATHER_API_KEY}&units=metric"
                resp = requests.get(url, timeout=2.5)
                if resp.status_code == 200:
                    data = resp.json()
                    rain_data = data.get("rain", {})
                    rain_mmh = rain_data.get("1h", 0.0)
                    visibility = data.get("visibility", 8000)
                    weather_desc = data.get("weather", [{}])[0].get("description", "Clear").title()
                    wind_kmh = round(data.get("wind", {}).get("speed", 3.0) * 3.6, 1)

                    return {
                        "condition": weather_desc,
                        "rain_intensity_mmh": float(rain_mmh),
                        "visibility_meters": float(visibility),
                        "wind_speed_kmh": wind_kmh,
                        "source": "OPENWEATHER_LIVE_API"
                    }
            except Exception as e:
                logger.warning(f"OpenWeather API call failed: {e}. Falling back to cache.")

        return self._cached_weather

weather_service = WeatherService()
