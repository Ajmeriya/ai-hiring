"""Configuration for AI Service"""

import os
from dotenv import load_dotenv

load_dotenv()

# Service Configuration
SERVICE_NAME = "AI Resume Matching Service"
SERVICE_VERSION = "1.0.0"
DEBUG = os.getenv("DEBUG", "False") == "True"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# API Configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", 8085))
API_RELOAD = os.getenv("API_RELOAD", "True") == "True"

# Embeddings Configuration
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
EMBEDDING_DIMENSION = 384

# Gemini Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_THRESHOLD = float(os.getenv("GEMINI_THRESHOLD", 0.6))  # Use Gemini if base_score > threshold

# Scoring Configuration
SEMANTIC_WEIGHT = 0.4
SKILL_WEIGHT = 0.4
EXPERIENCE_WEIGHT = 0.2

# Final Score Configuration
BASE_SCORE_WEIGHT = 0.7
GEMINI_SCORE_WEIGHT = 0.3

# Decision Thresholds
SHORTLIST_THRESHOLD = 75  # >= 75: Shortlisted
REVIEW_THRESHOLD = 60     # >= 60 and < 75: Under Review
REJECT_THRESHOLD = 0      # < 60: Rejected

# Microservice URLs
APPLICATION_SERVICE_URL = os.getenv("APPLICATION_SERVICE_URL", "http://localhost:8083")
JOB_SERVICE_URL = os.getenv("JOB_SERVICE_URL", "http://localhost:8082")

# Logging
LOGGING_FORMAT = os.getenv(
    "LOGGING_FORMAT",
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
