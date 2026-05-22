"""
AI Resume Matching Service
FastAPI application for resume evaluation against job descriptions
"""

import logging
import logging.config
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

import config
from api.routes import router

# Configure logging
logging.basicConfig(
    level=config.LOG_LEVEL,
    format=config.LOGGING_FORMAT
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown"""
    # Startup
    logger.info(f"Starting {config.SERVICE_NAME} v{config.SERVICE_VERSION}")
    yield
    # Shutdown
    logger.info(f"Shutting down {config.SERVICE_NAME}")


# Create FastAPI application
app = FastAPI(
    title=config.SERVICE_NAME,
    description="AI-powered resume matching service using hybrid approach: embeddings, vector similarity, and rule-based scoring",
    version=config.SERVICE_VERSION,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Frontend
        "http://localhost:8083",       # Application Service
        "http://localhost:8082",       # Job Service
        "http://localhost:8081",       # Auth Service
        "*"                            # Allow all (for development)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, tags=["resume-evaluation"])


@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": config.SERVICE_NAME,
        "version": config.SERVICE_VERSION,
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json",
        "endpoints": {
            "health": "GET /health",
            "evaluate": "POST /evaluate"
        }
    }


@app.on_event("startup")
async def startup():
    """Handle startup events"""
    logger.info(f"Initializing AI Service on {config.API_HOST}:{config.API_PORT}")
    logger.info(f"Embedding Model: {config.EMBEDDING_MODEL}")
    logger.info(f"Gemini API: {'Available' if config.GEMINI_API_KEY else 'Not configured'}")


@app.on_event("shutdown")
async def shutdown():
    """Handle shutdown events"""
    logger.info("AI Service shutting down")


if __name__ == "__main__":
    logger.info(f"Starting server on {config.API_HOST}:{config.API_PORT}")
    logger.info(f"Debug mode: {config.DEBUG}")
    logger.info(f"Auto-reload: {config.API_RELOAD}")
    logger.info(f"Log level: {config.LOG_LEVEL}")
    
    uvicorn.run(
        "main:app",
        host=config.API_HOST,
        port=config.API_PORT,
        reload=config.API_RELOAD,
        log_level=config.LOG_LEVEL.lower(),
        access_log=True
    )
