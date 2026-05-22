# Frontend

React + Vite frontend for both recruiter and candidate flows.

## What it does

- Recruiters can create jobs and inspect applicants.
- Candidates can browse jobs, apply, upload resumes, and start aptitude rounds.
- The aptitude flow opens the camera toggle and loads questions from `application-service`.

## Stack

- React
- Vite
- React Router
- Tailwind CSS
- Lucide React

## Important pages

- Recruiter dashboard and job management
- Job detail and assessment configuration
- Candidate application flow
- Candidate aptitude page

## Run

```powershell
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

## Auth

- JWT is stored in local storage.
- Authenticated requests use the token to call `application-service`.

## Current backend dependencies

- `application-service` on `8083`
- `job-service` on `8082`
- `question-service` on `8086`

## Notes

- The frontend now includes candidate-side aptitude round entry points.
- If the backend returns `404` on aptitude start, check whether the job exists and whether the candidate is shortlisted.
