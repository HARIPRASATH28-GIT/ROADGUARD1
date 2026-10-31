import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    APP_NAME: str = "RoadGuard AI"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # Security
    AUTH_SECRET_KEY: str = os.getenv("AUTH_SECRET_KEY", "roadguard-ai-secret-key-super-secure-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    # Third-party APIs
    OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "")
    OVERPASS_API_URL: str = os.getenv("OVERPASS_API_URL", "https://overpass-api.de/api/interpreter")
    
    # Guardrails
    ANONYMIZE_FACES_PLATES: bool = True
    DISABLE_IDENTITY_STORAGE: bool = True
    HUMAN_APPROVAL_REQUIRED: bool = True
    DEMO_MODE: bool = True
    
    # File Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    ML_MODELS_DIR: str = os.path.join(BASE_DIR, "ml", "models")

settings = Settings()
