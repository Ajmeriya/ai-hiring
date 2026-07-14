"""Configuration for the DSA and SQL question service."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

SERVICE_NAME = "DSA Question Service"
SERVICE_VERSION = "1.0.0"

API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", 8087))
API_RELOAD = os.getenv("API_RELOAD", "True") == "True"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

MYSQL_HOST = os.getenv("MYSQL_HOST", "mysql")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "ai_hiring_questions")

LOGGING_FORMAT = os.getenv(
    "LOGGING_FORMAT",
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
