# AI Resume Matching Service

A production-grade AI service for evaluating resumes against job descriptions using a hybrid approach combining semantic similarity, skill matching, and rule-based scoring.

## Features

✨ **Hybrid Matching System:**
- **Semantic Analysis**: Uses SBERT embeddings for semantic understanding
- **Vector Search**: FAISS-based similarity search on resume chunks
- **Skill Matching**: Identifies and matches technical skills
- **Experience Scoring**: Rule-based experience level evaluation
- **Selective AI Enhancement**: Uses Gemini API only for strong candidates (>60% base score)

📊 **Explainability:**
- Detailed score breakdown
- Matched and missing skills
- Experience alignment analysis
- Project insights
- Final hiring decision (Shortlisted/Under Review/Rejected)

🚀 **Production-Ready:**
- Modular, clean architecture
- Comprehensive error handling
- Logging and monitoring
- CORS enabled for microservices integration
- RESTful API with OpenAPI documentation

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Framework** | FastAPI |
| **Embeddings** | Sentence-BERT (all-MiniLM-L6-v2) |
| **Vector Store** | FAISS |
| **Document Loading** | LangChain, pdfplumber |
| **AI Enhancement** | Google Gemini API (optional) |
| **Language** | Python 3.9+ |

## Project Structure

```
ai-service/
│
├── api/                      # FastAPI routes and endpoints
│   └── routes.py            # Resume evaluation endpoint
│
├── loaders/                 # Document loading
│   └── resume_loader.py     # PDF/text resume parsing
│
├── processing/              # Text processing
│   ├── text_cleaner.py      # Text normalization and cleaning
│   └── extractor.py         # Information extraction (skills, exp, projects, certs)
│
├── embeddings/              # Embedding generation
│   └── embedding_model.py   # SBERT wrapper with similarity calculation
│
├── vectorstore/             # Vector store operations
│   └── faiss_store.py       # FAISS index and search
│
├── scoring/                 # Scoring engine
│   └── scorer.py            # Hybrid scoring with weighted formula
│
├── gemini/                  # Gemini integration
│   └── gemini_client.py     # Selective project/certification evaluation
│
├── main.py                  # FastAPI application entry point
├── config.py                # Configuration management
├── requirements.txt         # Python dependencies
├── .env.example             # Environment variables template
└── README.md                # This file
```

## Scoring Engine

### Base Score Formula
```
base_score = 0.4 × semantic_score + 0.4 × skill_score + 0.2 × experience_score

Where:
- semantic_score: Cosine similarity between resume and job description
- skill_score: Skill match percentage (with exact match bonus)
- experience_score: Rule-based experience alignment (0-1)
```

### Final Score Calculation
```
If base_score > 60% AND Gemini available:
    gemini_score: Average of project + certification evaluations
    final_score = 0.7 × base_score + 0.3 × gemini_score
Else:
    final_score = base_score

Final Score Scale: 0-100
```

### Decision Thresholds
- **≥ 75**: Shortlisted ✓
- **60-74**: Under Review 🔄
- **< 60**: Rejected ✗

## Installation

### 1. Clone and Setup
```bash
cd ai-service
```

### 2. Create Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment
```bash
cp .env.example .env
# Edit .env with your settings
# IMPORTANT: Add GEMINI_API_KEY if you want project/certification evaluation
```

### 5. Run Service
```bash
python main.py
```

The service will start on `http://localhost:8085`

Access API documentation: `http://localhost:8085/docs`

## API Usage

### Health Check
```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "embedding_model": "all-MiniLM-L6-v2",
  "gemini_available": true
}
```

### Evaluate Resume
```bash
POST /evaluate
```

Form Data:
- `resume_file`: PDF or text file (required)
- `job_description`: Job description text (required)
- `required_skills`: Comma-separated skills (optional)
- `required_years`: Required years of experience (optional)

Example using curl:
```bash
curl -X POST "http://localhost:8085/evaluate" \
  -F "resume_file=@resume.pdf" \
  -F "job_description=Senior Python Developer..." \
  -F "required_skills=Python,FastAPI,SQL,AWS" \
  -F "required_years=5"
```

Response:
```json
{
  "final_score": 82.5,
  "matched_skills": ["python", "fastapi", "sql", "aws"],
  "missing_skills": ["kubernetes", "gcp"],
  "experience_match": "6 years (required: 5 years) ✓ Meets requirement",
  "project_insight": "Found 3 projects",
  "decision": "Shortlisted",
  "score_breakdown": {
    "base_score": 0.800,
    "semantic_score": 0.850,
    "skill_score": 0.780,
    "experience_score": 1.000,
    "gemini_score": 0.820,
    "final_score": 81.4
  },
  "gemini_used": true
}
```

## Configuration

Edit `.env` file:

```env
# API
API_HOST=0.0.0.0
API_PORT=8085
API_RELOAD=True
DEBUG=False
LOG_LEVEL=INFO

# Model
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Gemini (Optional)
GEMINI_API_KEY=your-key-here
GEMINI_THRESHOLD=0.6  # Use Gemini if base_score > 60%
```

## Module Guide

### loaders/resume_loader.py
Handles PDF and text resume loading with validation.

**Key Methods:**
- `load_pdf(file_content)`: Extract text from PDF
- `load_text(file_content)`: Load plain text resume
- `validate_resume(text)`: Validate resume content

### processing/text_cleaner.py
Text normalization and section extraction.

**Key Methods:**
- `clean_text(text)`: Remove noise and normalize
- `extract_sections(text)`: Extract resume sections
- `remove_stopwords(text)`: Filter common words

### processing/extractor.py
Information extraction from resumes.

**Key Methods:**
- `extract_skills(text)`: Identify technical skills
- `extract_years_of_experience(text)`: Parse experience years
- `extract_projects(text)`: Extract project descriptions
- `extract_certifications(text)`: Find certifications
- `extract_education(text)`: Parse education details

### embeddings/embedding_model.py
SBERT embeddings wrapper with similarity calculation.

**Key Methods:**
- `embed_text(text)`: Single text embedding
- `embed_texts(texts)`: Batch embeddings
- `cosine_similarity(vec1, vec2)`: Calculate similarity
- `batch_cosine_similarity(vec, matrix)`: Batch similarity

### vectorstore/faiss_store.py
FAISS vector store operations.

**Key Methods:**
- `add_vectors(embeddings, documents)`: Add to index
- `search(query_embedding, k)`: Find similar documents
- `save/load(path)`: Persist index

### scoring/scorer.py
Hybrid scoring engine.

**Key Methods:**
- `calculate_semantic_score()`: Text similarity
- `calculate_skill_score()`: Skill matching
- `calculate_experience_score()`: Experience alignment
- `calculate_base_score()`: Weighted combination
- `calculate_final_score()`: Final score with optional Gemini

### gemini/gemini_client.py
Google Gemini API integration for selective evaluation.

**Key Methods:**
- `evaluate_projects(projects, job_requirements)`: Project assessment
- `evaluate_certifications(certs, job_requirements)`: Credential assessment

## Performance Considerations

### Embedding Generation
- First embedding: ~2-3 seconds (model download)
- Subsequent embeddings: ~50-100ms
- Model size: ~80MB (cached after first run)

### Scoring
- Base score calculation: ~100-200ms
- Gemini evaluation: ~2-5 seconds per call

### Total Time
- Without Gemini: ~200-300ms
- With Gemini: ~2-5 seconds

## Constraints & Limitations

✓ **Does NOT use:**
- OpenAI APIs
- Paid language models

✓ **Uses minimal external calls:**
- Gemini only called if base_score > 60%
- No unnecessary API calls

✓ **Cost-efficient:**
- All embeddings local (free)
- Vector search local (free)
- Gemini calls: ~1-2 per evaluation (if applicable)

## Development

### Run Tests
```bash
pytest tests/
```

### Code Quality
```bash
# Format code
black .

# Lint code
flake8 .

# Type checking
mypy .
```

## Deployment

### Docker
```bash
docker build -t ai-service .
docker run -p 8085:8085 -e GEMINI_API_KEY=your-key ai-service
```

### Kubernetes
See `k8s/deployment.yaml`

### Manual Server
```bash
# Production server
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8085
```

## Integration with Microservices

The AI Service integrates with:
- **Application Service** (port 8083): Send evaluation results
- **Job Service** (port 8082): Get job requirements

### Example Integration Flow
```
1. Candidate uploads resume via Frontend
2. Application Service receives upload
3. Application Service calls AI Service /evaluate
4. AI Service returns score and decision
5. Application Service updates application status
6. Frontend displays results to candidate
```

## Troubleshooting

### Model Download Issues
If first run is slow, it's downloading SBERT model (~80MB).
```
Set: EMBEDDING_MODEL=all-MiniLM-L6-v2
```

### Gemini API Errors
Ensure `GEMINI_API_KEY` is valid in `.env`
Service still works without it (Gemini evaluation disabled).

### Resume Parsing Issues
Supported formats: PDF, TXT
Large PDFs (>50MB) may timeout.

## Future Enhancements

- [ ] Resume image extraction (OCR)
- [ ] Multi-language support
- [ ] Custom skill database
- [ ] Advanced experience extraction
- [ ] Interview question generation
- [ ] Personality assessment
- [ ] Caching layer for frequently evaluated resumes

## License

MIT

## Support

For issues or questions:
1. Check logs in `/logs` directory
2. Review `.env` configuration
3. Ensure all dependencies installed: `pip install -r requirements.txt`
4. See API docs at `/docs` endpoint
