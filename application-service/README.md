# Application Service

Spring Boot microservice that orchestrates the candidate application lifecycle and assessment rounds.

## What it does

- Stores candidate applications.
- Tracks resume review, aptitude, technical, and interview round states.
- Calls `job-service` for job details and assessment configuration.
- Calls `question-service` for aptitude questions.
- Calls `ai-service` for resume analysis and other AI scoring.

## Current flow

```
Candidate applies
  ↓
Resume is uploaded / checked
  ↓
If shortlisted
  ↓
Start aptitude round
  ↓
application-service fetches job config from job-service
  ↓
application-service requests questions from question-service
  ↓
Frontend displays questions
```

## Important dependency

`Start Aptitude` needs `job-service` to be running and the job ID to exist.

If `GET http://localhost:8082/api/jobs/{id}` fails, the aptitude flow returns `404` / `not found`.

## API endpoints

- `POST /api/applications`
- `POST /api/applications/{id}/resume`
- `POST /api/applications/{id}/check-resume`
- `POST /api/applications/{id}/evaluate-resume-ai`
- `POST /api/applications/{id}/round/aptitude/start`
- `POST /api/applications/{id}/round/technical/start`
- `POST /api/applications/{id}/round/interview/start`
- `POST /api/applications/{id}/round/{round}/submit-score`
- `GET /api/applications/{id}`
- `GET /api/applications/job/{jobId}`
- `GET /api/applications/candidate/{candidateId}`

## Aptitude request fields

The aptitude round sends the following to `question-service`:

- `applicationId`
- `jobId`
- `count`
- `jobTitle`
- `jobDescription`
- `requiredSkills`
- `topics`
- `difficulty`
- `aptitudeType`
- `aptitudeTime`
- `recruiterTopicsRaw`

`difficulty` is normalized to `hard` for aptitude generation.

## Troubleshooting

- If the endpoint returns `404`, check whether the job exists in `job-service`.
- If the endpoint returns `403`, the JWT token is missing or invalid.
- If the endpoint returns `null` question batch, check `question-service` logs for `Question source=fallback` or `Question source=gemini`.

## Run

```powershell
mvn spring-boot:run
```

## Ports

- Application service: `8083`
- Job service: `8082`
- Question service: `8086`
- AI service: `8085`

## Database

- MySQL database: `ai_hiring_applications`
- Main table: `applications`
