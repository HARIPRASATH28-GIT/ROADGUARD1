import math
import pytest

def calculate_haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def test_geofence_trigger_within_300m():
    # Silk Board hotspot
    hs_lat, hs_lng = 12.9172, 77.6228
    
    # Point ~150 meters away
    user_lat, user_lng = 12.9180, 77.6235
    dist = calculate_haversine_distance_meters(hs_lat, hs_lng, user_lat, user_lng)
    
    assert dist < 300.0
    in_geofence = dist <= 300.0
    assert in_geofence is True

def test_geofence_outside_boundary():
    # Silk Board hotspot
    hs_lat, hs_lng = 12.9172, 77.6228
    
    # Point ~800 meters away
    user_lat, user_lng = 12.9240, 77.6280
    dist = calculate_haversine_distance_meters(hs_lat, hs_lng, user_lat, user_lng)
    
    assert dist > 300.0
    in_geofence = dist <= 300.0
    assert in_geofence is False
