import logging
import sys
from pathlib import Path

# Ensure project root is on sys.path for imports when run from scripts/
project_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(project_root))

from services.aptitude_service import GeminiQuestionGenerator
from models import AptitudeQuestionRequest
import config

logging.basicConfig(level=logging.DEBUG)
print('GEMINI_MODEL=', config.GEMINI_MODEL)
print('GEMINI_API_KEY present=', bool(config.GEMINI_API_KEY))
try:
    gen = GeminiQuestionGenerator()
    print('generator available:', gen.is_available())
    if gen.is_available():
        req = AptitudeQuestionRequest(application_id=1, job_id=1, count=1, job_title='Test', job_description='Test job', recruiter_topics_raw='', topics=['quant'], difficulty='easy', aptitude_type='standard', aptitude_time=10, required_skills=[])
        out = gen.generate(req, 1)
        print('generate output:', out)
except Exception as e:
    import traceback
    traceback.print_exc()
