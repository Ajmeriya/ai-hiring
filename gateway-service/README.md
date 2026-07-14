# Gateway Service

Spring Cloud Gateway entry point for the AI Hiring Platform.

Run it from `gateway-service`:

```bash
mvn spring-boot:run
```

Routes:
- `/api/auth/**` -> auth service
- `/api/jobs/**` -> job service
- `/api/applications/**` -> application service
- `/api/dsa/**` -> question service
- `/api/execute/**` -> execution service
- `/api/ai/**` -> AI service
