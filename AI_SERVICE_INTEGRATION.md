# AI Service Integration Guide

## Overview
The AI Service has been fully integrated with the Application Service using a hybrid approach combining multiple evaluation methods.

## Architecture Flow

```
Frontend (React)
    ↓
Application Service (Port 8083)
    ├─→ Calls Job Service (8082) [Get job details, requirements]
    ├─→ Calls AI Service (8085) [Evaluate resume with hybrid scoring]
    └─→ Updates database with evaluation results
```

## Services & Ports

| Service | Port | Purpose |
|---------|------|---------|
| Auth Service | 8081 | JWT authentication |
| Job Service | 8082 | Job listings, requirements, skills |
| **Application Service** | 8083 | Application workflow orchestration |
| Resume Checker Service | 8084 | Traditional resume validation (fallback) |
| **AI Service** | 8085 | AI-powered hybrid scoring engine |

---

## 1. AI Service (Python - FastAPI)

### Location
`ai-service/`

### Key Modules

#### Resume Processing Pipeline
- **loaders/resume_loader.py**: PDF/text extraction
- **processing/text_cleaner.py**: Text normalization
- **processing/extractor.py**: Skill/experience extraction

#### AI Evaluation Engine
- **embeddings/embedding_model.py**: SBERT embeddings (all-MiniLM-L6-v2)
- **vectorstore/faiss_store.py**: Vector similarity search
- **scoring/scorer.py**: Hybrid scoring formula
- **gemini/gemini_client.py**: Selective Gemini API calls

#### API Endpoints
- `GET /health` - Service status
- `POST /evaluate` - Resume evaluation

### Scoring Formula

```
Base Score = 0.4 × semantic_score + 0.4 × skill_score + 0.2 × experience_score

If base_score > 60% AND Gemini available:
    Final Score = 0.7 × base_score + 0.3 × gemini_score
Else:
    Final Score = base_score (0-100)
```

### Decision Thresholds
- **≥ 75**: Shortlisted ✓
- **60-74**: Under Review 🔄
- **< 60**: Rejected ✗

---

## 2. Application Service Integration (Java - Spring Boot)

### New Components Added

#### DTOs Created
1. **AIEvaluationResponse.java**
   - Maps Python FastAPI response
   - Fields: finalScore, matchedSkills, missingSkills, experienceMatch, projectInsight, decision, scoreBreakdown, geminiUsed

2. **AIEvaluationRequest.java**
   - Maps Python request model
   - Fields: resumeFile, jobDescription, requiredSkills, requiredYears

#### Service Layer Updated
- **ApplicationService.java**
  - New method: `evaluateResumeWithAI(applicationId, resumeFile)`
  - Calls AI Service `/evaluate` endpoint
  - Falls back to resume-checker service if AI evaluation fails
  - Updates application with AI evaluation results

#### Client Updated
- **MicroserviceClient.java**
  - New method: `evaluateResume(resumeFile, jobDescription, requiredSkills, requiredYears)`
  - Sends multipart form data to AI Service (port 8085)
  - Handles HTTP communication with proper error logging

#### Model Enhanced
- **Application.java**
  - New field: `aiEvaluationDetails` (stores matched/missing skills, experience match, Gemini usage info)

#### Controller Updated
- **ApplicationController.java**
  - New endpoint: `POST /api/applications/{id}/evaluate-resume-ai`
  - Accepts multipart form with resume file
  - Returns ApplicationResponse with AI evaluation results

---

## 3. Integration Points

### How Resume Evaluation Works

#### Step 1: Create Application
```
POST /api/applications
{
  "jobId": 1,
  "candidateId": "cand_123",
  "candidateEmail": "user@example.com"
}
↓
Application created with status APPLIED, currentRound = RESUME
```

#### Step 2: Submit Resume
```
POST /api/applications/{applicationId}/resume
{
  "resumePath": "/uploads/resume.pdf"
}
↓
Resume stored, status = RESUME_REVIEWING
```

#### Step 3: Evaluate Resume with AI [NEW]
```
POST /api/applications/{applicationId}/evaluate-resume-ai
Content-Type: multipart/form-data
{
  "resume_file": [PDF/TEXT FILE]
}
↓
Application Service Flow:
  1. Fetches job details from Job Service (8082)
  2. Calls AI Service (8085) with:
     - resume_file (uploaded file)
     - job_description (from job details)
     - required_skills (from job details)
     - required_years (from job details)
  3. AI Service returns: AIEvaluationResponse
  4. Updates Application with:
     - resumeScore (finalScore from AI)
     - aiEvaluationDetails (matched/missing skills, experience, etc)
     - resumeStatus (SHORTLISTED or REJECTED based on decision)
  5. If shortlisted: Move to next round (Aptitude/Technical/Interview)
  6. If rejected: Mark as RESUME_REJECTED
↓
ApplicationResponse returned with updated status
```

---

## 4. Frontend Integration

### Resume Upload Flow

```javascript
// 1. Create application
POST /api/applications
→ Returns: { applicationId, status: "APPLIED" }

// 2. Upload resume and evaluate with AI
POST /api/applications/{applicationId}/evaluate-resume-ai
Content-Type: multipart/form-data
{
  "resume_file": File
}
→ Returns: {
    id: applicationId,
    resumeScore: 82.5,
    resumeStatus: "SHORTLISTED",
    aiEvaluationDetails: "Matched: Python, FastAPI, SQL | Missing: Kubernetes, Docker | Experience: 6 years (required: 5) ✓ Meets requirement | Gemini Used: true",
    currentRound: "APTITUDE",
    overallStatus: "IN_ASSESSMENT"
  }

// 3. Start assessment rounds based on job configuration
POST /api/applications/{applicationId}/round/aptitude/start
POST /api/applications/{applicationId}/round/technical/start
POST /api/applications/{applicationId}/round/interview/start
```

---

## 5. Configuration

### AI Service (.env)
```
API_HOST=0.0.0.0
API_PORT=8085
EMBEDDING_MODEL=all-MiniLM-L6-v2
GEMINI_API_KEY=your-key-here        # Optional
GEMINI_THRESHOLD=0.6                 # Use Gemini if base_score > 60%
APPLICATION_SERVICE_URL=http://localhost:8083
JOB_SERVICE_URL=http://localhost:8082
```

### Application Service (application.properties)
```
spring.application.name=application-service
server.port=8083
jwt.secret=your-jwt-secret-key
```

---

## 6. Data Flow Example

### Candidate Journey

```
1. Candidate views jobs → Frontend (React, Port 3000)
2. Applies for job → Create Application (App Service)
3. Uploads resume → Submit Resume endpoint
4. AI evaluates resume → Evaluate Resume with AI endpoint
   ├─ Gets job requirements from Job Service
   ├─ AI Service analyzes resume (semantic + skills + experience)
   ├─ Optionally calls Gemini for project/certification insights
   └─ Returns score & decision
5. If shortlisted:
   └─ Proceeds to assessment rounds (Aptitude/Technical/Interview)
6. If rejected:
   └─ Application marked as RESUME_REJECTED
```

---

## 7. Error Handling & Fallback

### AI Service Unavailable
```
If /evaluate call fails:
  ↓
Fall back to resume-checker service (port 8084)
  ↓
If resume-checker also fails:
  ↓
Resume status = PENDING (retry later)
```

### Missing Gemini API Key
```
If GEMINI_API_KEY not set:
  ↓
Final score = base_score
  ↓
Service still works, just without optional Gemini enhancement
```

---

## 8. Key Features

### ✅ Hybrid Scoring
- Semantic similarity (SBERT embeddings)
- Skill matching with exact match bonus
- Experience-based scoring
- Optional Gemini API for insights

### ✅ Explainability
- Detailed score breakdown
- Matched vs missing skills
- Experience alignment analysis
- Project insights
- Hiring decision (Shortlisted/Under Review/Rejected)

### ✅ Cost Optimization
- No OpenAI dependency
- Local embeddings (free)
- FAISS vector search (free)
- Selective Gemini calls (only if base_score > 60%)

### ✅ Resilience
- Fallback to resume-checker service
- Graceful degradation if APIs unavailable
- Comprehensive logging
- Transaction management in Application Service

---

## 9. Deployment Steps

### 1. Start AI Service
```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
# Service runs on port 8085
```

### 2. Start Application Service
```bash
cd application-service
mvn clean package -DskipTests
java -jar target/application-service-0.0.1-SNAPSHOT.jar
# Service runs on port 8083
```

### 3. Start Other Services
```bash
# Auth Service (port 8081)
# Job Service (port 8082)
# Resume Checker Service (port 8084) - Optional
# Frontend (port 3000)
```

---

## 10. Testing Integration

### Health Check
```bash
curl http://localhost:8085/health
→ {"status":"ok","embedding_model":"all-MiniLM-L6-v2","gemini_available":true}
```

### Test Resume Evaluation
```bash
curl -X POST http://localhost:8085/evaluate \
  -F "resume_file=@resume.pdf" \
  -F "job_description=Senior Python Developer..." \
  -F "required_skills=Python,FastAPI,SQL,AWS" \
  -F "required_years=5"
```

### Test Application Service Integration
```bash
# Create application
curl -X POST http://localhost:8083/api/applications \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"jobId":1,"candidateId":"cand_123","candidateEmail":"user@example.com"}'

# Evaluate resume with AI
curl -X POST http://localhost:8083/api/applications/1/evaluate-resume-ai \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "resume_file=@resume.pdf"
```

---

## 11. Database Schema Updates

### New Column in applications Table
```sql
ALTER TABLE applications ADD COLUMN ai_evaluation_details TEXT;
```

### Automatic Migration
The application uses Hibernate with `spring.jpa.hibernate.ddl-auto=update`, so columns are created automatically on startup.

---

## 12. Microservice Communication

All inter-service calls include JWT token injection for security:

```java
// In MicroserviceClient
HttpHeaders headers = new HttpHeaders();
headers.setBearerAuth(jwtToken);
HttpEntity<Object> entity = new HttpEntity<>(body, headers);
restTemplate.postForObject(url, entity, ResponseClass.class);
```

---

## Summary of Integration

| Component | Location | Role |
|-----------|----------|------|
| AI Service | Python/FastAPI | Resume evaluation engine |
| Application Service | Java/Spring Boot | Orchestration & workflow |
| MicroserviceClient | Application Service | Inter-service communication |
| AIEvaluationResponse | DTO | Response mapping |
| ApplicationController | REST API | New `/evaluate-resume-ai` endpoint |
| Database | MySQL | Stores AI evaluation details |

---

**Next Steps:**
1. ✅ Deploy AI Service and Application Service
2. ✅ Test `/evaluate-resume-ai` endpoint
3. ✅ Update frontend to call new endpoint
4. ✅ Monitor AI Service logs for evaluation performance
5. ✅ Fine-tune scoring weights based on results
