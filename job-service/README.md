# Job Service

Spring Boot service for recruiter job postings and assessment configuration.

## What it does

- Stores job postings.
- Stores assessment configuration for aptitude, technical, and interview rounds.
- Exposes job details to `application-service`.

## Main endpoints

- `POST /api/jobs`
- `GET /api/jobs`
- `GET /api/jobs/{id}`
- `PATCH /api/jobs/{id}`

## Request shape

`POST /api/jobs` accepts:

- `title`
- `company`
- `department`
- `salary`
- `description`
- `requiredExperienceYears`
- `skills`
- `jobRounds`
- `aptitudeConfig`
- `technicalConfig`
- `interviewConfig`

## Aptitude config

- `numQuestions`
- `topics`
- `type`
- `time`

## Run

```powershell
mvn spring-boot:run
```

## Notes

- `application-service` must be able to reach this service on `http://localhost:8082`.
- If a job ID does not exist, aptitude start will fail upstream.