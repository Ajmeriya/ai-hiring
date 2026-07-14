"""FastAPI application entry point for the DSA question service."""

from contextlib import asynccontextmanager
import logging

import uvicorn
from fastapi import FastAPI

import config
from api.routes import router
from db import initialize_schema
from services.question_service import ensure_seed_data

logging.basicConfig(level=config.LOG_LEVEL, format=config.LOGGING_FORMAT)
logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s v%s", config.SERVICE_NAME, config.SERVICE_VERSION)
    initialize_schema()
    ensure_seed_data()
    yield
    logger.info("Shutting down %s", config.SERVICE_NAME)


app = FastAPI(
    title=config.SERVICE_NAME,
    description="Standalone DSA and SQL question service with DB-backed seeded question banks.",
    version=config.SERVICE_VERSION,
    lifespan=lifespan,
)

app.include_router(router, tags=["dsa-questions"])


@app.get("/")
async def root():
    return {
        "service": config.SERVICE_NAME,
        "version": config.SERVICE_VERSION,
        "status": "running",
        "docs": "/docs",
        "health": "/api/dsa/health",
        "assign": "/api/dsa/questions/assign",
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=config.API_HOST,
        port=config.API_PORT,
        reload=config.API_RELOAD,
        log_level=config.LOG_LEVEL.lower(),
        access_log=True,
    )
