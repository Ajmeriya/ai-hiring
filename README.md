# AI Hiring Platform

End-to-end hiring platform with recruiter, candidate, and assessment microservices.

## What’s in this repo

| Service | Port | Purpose |
| --- | ---: | --- |
| `auth-service` | 8081 | JWT login and account auth |
| `job-service` | 8082 | Recruiter job postings and assessment config |
| `application-service` | 8083 | Candidate application flow and round orchestration |
| `resume-checker-service` | 8084 | Legacy resume screening fallback |
| `ai-service` | 8085 | Resume analysis and scoring |
| `question-service` | 8086 | Aptitude question bank and Gemini generation |
| `frontend` | 3000 | React UI for recruiter and candidate flows |

## Main flow

1. Recruiter creates a job in `job-service`.
2. Candidate applies through the frontend.
3. `application-service` stores the application and checks the resume.
4. If shortlisted, aptitude questions are fetched from `question-service`.
5. Technical and interview rounds are handled by the other assessment services.

## Important docs

- [question-service/README.md](question-service/README.md)
- [application-service/README.md](application-service/README.md)
- [job-service/README.md](job-service/README.md)
- [frontend/README.md](frontend/README.md)
- [ai-service/README.md](ai-service/README.md)
- [auth-service/README.md](auth-service/README.md)
- [AI_SERVICE_INTEGRATION.md](AI_SERVICE_INTEGRATION.md)

## Suggested local start order

1. Start MySQL.
2. Start `auth-service`.
3. Start `job-service`.
4. Start `ai-service`.
5. Start `question-service`.
6. Start `application-service`.
7. Start `frontend`.

## Notes

- `application-service` depends on `job-service` being reachable on `http://localhost:8082`.
- `question-service` can use Gemini, but it falls back to local aptitude templates if Gemini is unavailable.
- Existing applications can keep their assigned questions in MySQL, so a job must exist before starting the aptitude round.

## Quick run examples

```powershell
Set-Location C:\Users\ADMIN\Desktop\ai-hiring-platform\job-service
mvn spring-boot:run
```

```powershell
Set-Location C:\Users\ADMIN\Desktop\ai-hiring-platform\question-service
& ..\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --host 0.0.0.0 --port 8086 --reload
```

```powershell
Set-Location C:\Users\ADMIN\Desktop\ai-hiring-platform\frontend
npm run dev
```
