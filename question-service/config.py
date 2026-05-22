"""Configuration for the standalone aptitude question service."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

SERVICE_NAME = "AI Aptitude Question Service"
SERVICE_VERSION = "1.0.0"

API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", 8086))
API_RELOAD = os.getenv("API_RELOAD", "True") == "True"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "ai_hiring_questions")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

POOL_MULTIPLIER = int(os.getenv("POOL_MULTIPLIER", 5))

LOGGING_FORMAT = os.getenv(
    "LOGGING_FORMAT",
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
