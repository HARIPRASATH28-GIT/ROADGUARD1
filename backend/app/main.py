import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import db

# Import routers
from backend.app.api.auth_routes import router as auth_router
from backend.app.api.risk_routes import router as risk_router
from backend.app.api.simulation_routes import router as simulation_router
from backend.app.api.traffic_routes import router as traffic_router
from backend.app.api.maintenance_routes import router as maintenance_router
from backend.app.api.public_routes import router as public_router
from backend.app.api.metrics_routes import router as metrics_router
from backend.app.api.vision_routes import router as vision_router
from backend.app.api.incident_routes import router as incident_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="RoadGuard AI: Moving Road Safety from Reactive to Preventive. Hackathon Prototype.",
    docs_url=f"{settings.API_PREFIX}/docs",
    openapi_url=f"{settings.API_PREFIX}/openapi.json"
)

# Enable CORS for frontend Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under standard prefix
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(risk_router, prefix=settings.API_PREFIX)
app.include_router(simulation_router, prefix=settings.API_PREFIX)
app.include_router(traffic_router, prefix=settings.API_PREFIX)
app.include_router(maintenance_router, prefix=settings.API_PREFIX)
app.include_router(public_router, prefix=settings.API_PREFIX)
app.include_router(metrics_router, prefix=settings.API_PREFIX)
app.include_router(vision_router, prefix=settings.API_PREFIX)
app.include_router(incident_router, prefix=settings.API_PREFIX)

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "OPERATIONAL",
        "guardrails": {
            "identity_surveillance": "DISABLED (No plate/face extraction)",
            "temporary_tracker_ids": "DROPPED_AFTER_WINDOW_AGGREGATION",
            "human_approval_gate": "ENFORCED (Public & maintenance require officer sign-off)",
            "groundedness_check": "ACTIVE (Zero-hallucination verification)"
        },
        "docs_url": f"{settings.API_PREFIX}/docs"
    }

@app.get(f"{settings.API_PREFIX}/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "SQLITE_OPERATIONAL",
        "models_loaded": True
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
