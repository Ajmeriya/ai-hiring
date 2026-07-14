package com.aihiring.applicationservice.service;

import com.aihiring.applicationservice.config.MicroserviceClient;
import com.aihiring.applicationservice.dto.*;
import com.aihiring.applicationservice.model.Application;
import com.aihiring.applicationservice.repository.ApplicationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ApplicationService {

    private static final Logger logger = LoggerFactory.getLogger(ApplicationService.class);
    private static final float RESUME_SHORTLIST_THRESHOLD = 65.0f;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private MicroserviceClient microserviceClient;

    // ===== 1. Create Application with Resume =====
    public ApplicationResponse createApplication(CreateApplicationRequest request) {
        // Check if candidate already applied for this job
        Optional<Application> existing = applicationRepository.findByJobIdAndCandidateId(
                request.jobId(),
                request.candidateId()
        );

        if (existing.isPresent()) {
            return toApplicationResponse(existing.get());
        }

        Application application = new Application();
        application.setJobId(request.jobId());
        application.setCandidateId(request.candidateId());
        application.setCandidateEmail(request.candidateEmail());
        if (request.resumePath() != null && !request.resumePath().isBlank()) {
            application.setResumePath(request.resumePath());
        }
        application.setOverallStatus(Application.ApplicationStatus.APPLIED);
        application.setCurrentRound(Application.Round.RESUME);
        application.setResumeStatus(Application.ResumeStatus.PENDING);
        // Initialize round statuses to null (not started) rather than completed
        application.setAptitudeStatus(null);
        application.setTechnicalStatus(null);
        application.setInterviewStatus(null);

        Application saved = applicationRepository.save(application);
        logger.info("Application created: ID={}, JobID={}, CandidateID={}", saved.getId(), request.jobId(), request.candidateId());
        return toApplicationResponse(saved);
    }

    // ===== 2. Submit Resume =====
    public ApplicationResponse submitResume(Long applicationId, String resumePath) {
        Optional<Application> optional = applicationRepository.findById(applicationId);

        if (optional.isEmpty()) {
            logger.warn("Application not found: ID={}", applicationId);
            return null;
        }

        Application application = optional.get();
        validateResumeCanBeUpdated(application);
        application.setResumePath(resumePath);
        application.setResumeStatus(Application.ResumeStatus.PENDING);
        application.setOverallStatus(Application.ApplicationStatus.RESUME_REVIEWING);

        Application saved = applicationRepository.save(application);
        logger.info("Resume submitted for application: ID={}", applicationId);
        return toApplicationResponse(saved);
    }

    // ===== 3. Check Resume (call resume-checker service) =====
    public ApplicationResponse checkResume(Long applicationId) {
        Optional<Application> optional = applicationRepository.findById(applicationId);

        if (optional.isEmpty()) {
            return null;
        }

        Application application = optional.get();

        // Fetch job details to get job description and skills
        JobDetailsResponse jobDetails = microserviceClient.getJobDetails(application.getJobId());
        if (jobDetails == null) {
            logger.error("Failed to fetch job details for jobId: {}", application.getJobId());
            return toApplicationResponse(application);
        }

        // Call resume checker service
        String requiredSkills = String.join(",", jobDetails.skills());
        ResumeCheckResponse checkResult = microserviceClient.checkResume(
                applicationId,
                application.getResumePath(),
                jobDetails.description(),
                requiredSkills
        );

        if (checkResult == null) {
            logger.warn("Resume check failed for application: ID={}", applicationId);
            application.setResumeStatus(Application.ResumeStatus.PENDING);
            applicationRepository.save(application);
            return toApplicationResponse(application);
        }

        // Update application based on resume result
        application.setResumeScore(checkResult.score());

        if (checkResult.shortlisted()) {
            application.setResumeStatus(Application.ResumeStatus.SHORTLISTED);
            // Move to first assessment round or mark as completed if no rounds
            moveToNextRound(application, jobDetails);
        } else {
            application.setResumeStatus(Application.ResumeStatus.REJECTED);
            application.setOverallStatus(Application.ApplicationStatus.RESUME_REJECTED);
            application.setCurrentRound(Application.Round.COMPLETED);
        }

        Application saved = applicationRepository.save(application);
        logger.info("Resume checked for application: ID={}, Shortlisted={}", applicationId, checkResult.shortlisted());
        return toApplicationResponse(saved);
    }

    // ===== 3B. Evaluate Resume with AI Service (Hybrid Scoring) =====
    /**
     * Evaluates resume using AI Service with hybrid scoring engine.
     * A resume score above the shortlist threshold advances the candidate to aptitude.
     */
    public ApplicationResponse evaluateResumeWithAI(Long applicationId, MultipartFile resumeFile) {
        Optional<Application> optional = applicationRepository.findById(applicationId);

        if (optional.isEmpty()) {
            logger.warn("Application not found: ID={}", applicationId);
            return null;
        }

        Application application = optional.get();
        validateResumeCanBeUpdated(application);

        if (resumeFile != null && resumeFile.getOriginalFilename() != null && !resumeFile.getOriginalFilename().isBlank()) {
            application.setResumePath(resumeFile.getOriginalFilename());
        }
        application.setOverallStatus(Application.ApplicationStatus.RESUME_REVIEWING);

        // Fetch job details to get job description and skills
        JobDetailsResponse jobDetails = microserviceClient.getJobDetails(application.getJobId());
        if (jobDetails == null) {
            logger.error("Failed to fetch job details for jobId: {}", application.getJobId());
            return toApplicationResponse(application);
        }

        // Prepare parameters for AI Service
        String requiredSkills = String.join(",", jobDetails.skills());
        Integer requiredYears = 0; // Default experience requirement

        // Call AI Service evaluation endpoint
        AIEvaluationResponse aiResult = microserviceClient.evaluateResume(
                resumeFile,
                jobDetails.description(),
                requiredSkills,
                requiredYears
        );

        if (aiResult == null) {
            logger.warn("AI evaluation failed for application: ID={}, falling back to resume-checker", applicationId);
            // Fallback to resume-checker service
            return checkResume(applicationId);
        }

        logger.info(
            "AI service response for application ID={}: finalScore={}, decision={}, geminiUsed={}, matchedSkills={}, missingSkills={}",
            applicationId,
            aiResult.finalScore(),
            aiResult.decision(),
            aiResult.geminiUsed(),
            aiResult.matchedSkills(),
            aiResult.missingSkills()
        );

        // Update application with AI evaluation results
        application.setResumeScore(aiResult.finalScore().floatValue());
        application.setAIEvaluationDetails(
                String.format("Matched: %s | Missing: %s | %s | Gemini Used: %s",
                        String.join(", ", aiResult.matchedSkills()),
                        String.join(", ", aiResult.missingSkills()),
                        aiResult.experienceMatch(),
                        aiResult.geminiUsed() != null && aiResult.geminiUsed())
        );

        // Determine shortlist status based on score so strong resumes reach aptitude.
        boolean shortlisted = aiResult.finalScore() != null && aiResult.finalScore() > RESUME_SHORTLIST_THRESHOLD;

        if (shortlisted) {
            application.setResumeStatus(Application.ResumeStatus.SHORTLISTED);
            // Move to first assessment round or mark as completed if no rounds
            moveToNextRound(application, jobDetails);
        } else {
            application.setResumeStatus(Application.ResumeStatus.REJECTED);
            application.setOverallStatus(Application.ApplicationStatus.RESUME_REJECTED);
            application.setCurrentRound(Application.Round.COMPLETED);
        }

        Application saved = applicationRepository.save(application);
        logger.info("Resume evaluated with AI: ID={}, Score={}, Decision={}, Shortlisted={}, NextRound={}",
            applicationId, aiResult.finalScore(), aiResult.decision(), shortlisted, application.getCurrentRound());
        return toApplicationResponse(saved);
    }

    // ===== 4. Move to Next Round =====
    private void moveToNextRound(Application application, JobDetailsResponse jobDetails) {
        if (jobDetails.jobRounds().aptitudeEnabled()) {
            application.setCurrentRound(Application.Round.APTITUDE);
            application.setAptitudeStatus(Application.RoundStatus.NOT_STARTED);
            application.setOverallStatus(Application.ApplicationStatus.IN_ASSESSMENT);
        } else if (jobDetails.jobRounds().technicalEnabled()) {
            application.setCurrentRound(Application.Round.TECHNICAL);
            application.setTechnicalStatus(Application.RoundStatus.NOT_STARTED);
            application.setOverallStatus(Application.ApplicationStatus.IN_ASSESSMENT);
        } else if (jobDetails.jobRounds().interviewEnabled()) {
            application.setCurrentRound(Application.Round.INTERVIEW);
            application.setInterviewStatus(Application.RoundStatus.NOT_STARTED);
            application.setOverallStatus(Application.ApplicationStatus.IN_ASSESSMENT);
        } else {
            application.setCurrentRound(Application.Round.COMPLETED);
            application.setOverallStatus(Application.ApplicationStatus.COMPLETED);
        }
    }

    // ===== 5. Start Aptitude Round (fetch questions from question-service) =====
    public ApplicationRoundResponse startAptitudeRound(Long applicationId) {
        Optional<Application> optional = applicationRepository.findById(applicationId);
        if (optional.isEmpty()) {
            logger.warn("Aptitude start failed: application not found. applicationId={}", applicationId);
            return null;
        }

        Application application = optional.get();
        if (application.getResumeStatus() != Application.ResumeStatus.SHORTLISTED) {
            throw new IllegalStateException("Candidate is not shortlisted for the aptitude round");
        }

        // Fetch job details for aptitude config
        JobDetailsResponse jobDetails = microserviceClient.getJobDetails(application.getJobId());
        if (jobDetails != null && !jobDetails.jobRounds().aptitudeEnabled()) {
            logger.warn("Aptitude round not available for job: {}", application.getJobId());
            return null;
        }

        if (jobDetails == null) {
            logger.warn("Job details unavailable for applicationId={}, jobId={}; using fallback aptitude config", applicationId, application.getJobId());
            jobDetails = buildFallbackJobDetails(application.getJobId());
        }

        // Fetch questions from dedicated question-service
        var config = jobDetails.aptitudeConfig();
        if (config == null) {
            logger.warn("Aptitude start failed: aptitudeConfig missing for jobId={}; using fallback aptitude config", application.getJobId());
            config = new JobDetailsResponse.AptitudeConfigResponse(5, "Aptitude", "mcq", 20);
            jobDetails = new JobDetailsResponse(
                    jobDetails.id(),
                    jobDetails.title(),
                    jobDetails.company(),
                    jobDetails.department(),
                    jobDetails.salary(),
                    jobDetails.description(),
                    jobDetails.requiredExperienceYears(),
                    jobDetails.status(),
                    jobDetails.skills(),
                    jobDetails.jobRounds(),
                    config,
                    jobDetails.technicalConfig(),
                    jobDetails.interviewConfig()
            );
        }
        AptitudeQuestionRequest questionRequest = new AptitudeQuestionRequest(
                application.getId(),
                application.getJobId(),
                config.numQuestions(),
                jobDetails.title(),
                jobDetails.description(),
                jobDetails.skills(),
                parseTopics(config.topics()),
                "hard",
                config.type(),
                config.time(),
                config.topics()
        );

        AptitudeQuestionBatchResponse questionBatch = microserviceClient.getAptitudeQuestions(questionRequest);
        if (questionBatch == null) {
            logger.error(
                    "Failed to load aptitude questions for applicationId={} jobId={} request={{count:{}, topics:{}, difficulty:{}, type:{}, time:{}}}",
                    applicationId,
                    application.getJobId(),
                    config.numQuestions(),
                    config.topics(),
                    "hard",
                    config.type(),
                    config.time()
            );
            return null;
        }

        // Update application status
        application.setAptitudeStatus(Application.RoundStatus.IN_PROGRESS);
        application.setCurrentRound(Application.Round.APTITUDE);
        applicationRepository.save(application);

        logger.info("Aptitude round started for application: ID={}", applicationId);
        return new ApplicationRoundResponse(applicationId, "APTITUDE", Application.RoundStatus.IN_PROGRESS.toString(), questionBatch.questions());
    }

    private JobDetailsResponse buildFallbackJobDetails(Long jobId) {
        return new JobDetailsResponse(
                jobId,
                "Job " + jobId,
                "AI Hiring Platform",
                "Candidate Portal",
                "",
                "",
                null,
                "active",
                List.of(),
                new JobDetailsResponse.JobRoundsResponse(true, false, false),
                new JobDetailsResponse.AptitudeConfigResponse(5, "Aptitude", "mcq", 20),
                null,
                null
        );
    }

    public ApplicationRoundResponse startTechnicalRound(Long applicationId) {
        Optional<Application> optional = applicationRepository.findById(applicationId);
        if (optional.isEmpty()) {
            return null;
        }

        Application application = optional.get();

        // Fetch job details for technical config
        JobDetailsResponse jobDetails = microserviceClient.getJobDetails(application.getJobId());
        if (jobDetails == null || !jobDetails.jobRounds().technicalEnabled()) {
            logger.warn("Technical round not available for job: {}", application.getJobId());
            return null;
        }

        // Fetch questions from AI Service
        var config = jobDetails.technicalConfig();
        CodingQuestionAssignResponse questionBatch = microserviceClient.getCodingQuestions(
                new CodingQuestionAssignRequest(
                        application.getId(),
                        application.getJobId(),
                        config == null ? 0 : config.dsaQuestions(),
                        parseTopics(config == null ? null : config.dsaTopics()),
                        config == null ? "medium" : config.dsaDifficulty(),
                        config == null ? 0 : config.sqlQuestions(),
                        parseTopics(config == null ? null : config.sqlTopics()),
                        config == null ? "medium" : config.sqlDifficulty()
                )
        );

        if (questionBatch == null || questionBatch.questions() == null || questionBatch.questions().isEmpty()) {
            logger.error("Failed to load coding questions for applicationId={} jobId={}", applicationId, application.getJobId());
            return null;
        }

        // Update application status
        application.setTechnicalStatus(Application.RoundStatus.IN_PROGRESS);
        application.setCurrentRound(Application.Round.TECHNICAL);
        applicationRepository.save(application);

        logger.info("Technical round started for application: ID={}", applicationId);
        return new ApplicationRoundResponse(applicationId, "TECHNICAL", Application.RoundStatus.IN_PROGRESS.toString(), questionBatch.questions());
    }

    public CodeExecutionResponse runTechnicalQuestion(Long applicationId, TechnicalRunRequest request) {
        Optional<Application> optional = applicationRepository.findById(applicationId);
        if (optional.isEmpty()) {
            return null;
        }

        List<CodingQuestionTestCase> visibleTestCases = microserviceClient.getQuestionTestCases(request.questionId(), false);
        if (visibleTestCases.isEmpty()) {
            logger.warn("No visible test cases found for questionId={}", request.questionId());
        }

        CodeExecutionRequest executionRequest = new CodeExecutionRequest(
                request.language(),
                request.code(),
                visibleTestCases.stream()
                        .map(testCase -> new CodeExecutionTestCase(testCase.inputData(), testCase.expectedOutput(), testCase.hidden()))
                        .toList(),
                2
        );

        return microserviceClient.runCode(executionRequest);
    }

    public CodeExecutionResponse submitTechnicalRound(Long applicationId, TechnicalSubmissionRequest request) {
        Optional<Application> optional = applicationRepository.findById(applicationId);
        if (optional.isEmpty()) {
            return null;
        }

        int totalPassed = 0;
        int totalTests = 0;
        java.util.ArrayList<CodeExecutionTestResult> allResults = new java.util.ArrayList<>();

        for (TechnicalSubmissionRequest.QuestionSubmission submission : request.questions()) {
            List<CodingQuestionTestCase> allTestCases = microserviceClient.getQuestionTestCases(submission.questionId(), true);
            CodeExecutionRequest executionRequest = new CodeExecutionRequest(
                    submission.language() != null ? submission.language() : request.language(),
                    submission.code(),
                    allTestCases.stream()
                            .map(testCase -> new CodeExecutionTestCase(testCase.inputData(), testCase.expectedOutput(), testCase.hidden()))
                            .toList(),
                    2
            );

            CodeExecutionResponse executionResponse = microserviceClient.submitCode(executionRequest);
            if (executionResponse == null) {
                continue;
            }
            totalPassed += executionResponse.passed() == null ? 0 : executionResponse.passed();
            totalTests += executionResponse.total() == null ? 0 : executionResponse.total();
            if (executionResponse.results() != null) {
                allResults.addAll(executionResponse.results());
            }
        }

        float score = totalTests > 0 ? Math.round((totalPassed * 100.0f / totalTests) * 10f) / 10f : 0.0f;
        CodeExecutionResponse summary = new CodeExecutionResponse(
                totalPassed,
                totalTests,
                totalPassed == totalTests && totalTests > 0 ? "Accepted" : "Wrong Answer",
                null,
                null,
                0,
                allResults
        );

        submitRoundScore(applicationId, "TECHNICAL", score);
        return summary;
    }

    public ApplicationRoundResponse startInterviewRound(Long applicationId) {
        Optional<Application> optional = applicationRepository.findById(applicationId);
        if (optional.isEmpty()) {
            return null;
        }

        Application application = optional.get();

        // Fetch job details for interview config
        JobDetailsResponse jobDetails = microserviceClient.getJobDetails(application.getJobId());
        if (jobDetails == null || !jobDetails.jobRounds().interviewEnabled()) {
            logger.warn("Interview round not available for job: {}", application.getJobId());
            return null;
        }

        // Fetch questions from AI Service
        var config = jobDetails.interviewConfig();
        var questions = microserviceClient.getInterviewQuestions(config.topics());

        // Update application status
        application.setInterviewStatus(Application.RoundStatus.IN_PROGRESS);
        application.setCurrentRound(Application.Round.INTERVIEW);
        applicationRepository.save(application);

        logger.info("Interview round started for application: ID={}", applicationId);
        return new ApplicationRoundResponse(applicationId, "INTERVIEW", Application.RoundStatus.IN_PROGRESS.toString(), questions);
    }

    // ===== 6. Submit Round Score =====
    public ApplicationResponse submitRoundScore(Long applicationId, String round, Float score) {
        Optional<Application> optional = applicationRepository.findById(applicationId);

        if (optional.isEmpty()) {
            return null;
        }

        Application application = optional.get();

        switch (round.toUpperCase()) {
            case "APTITUDE":
                application.setAptitudeScore(score);
                // New rule: aptitude requires 65% to pass
                if (score != null && score >= 65.0f) {
                    application.setAptitudeStatus(Application.RoundStatus.PASSED);
                    // proceed to next round only on pass
                    moveToNextAssessmentRound(application, Application.Round.APTITUDE);
                } else {
                    application.setAptitudeStatus(Application.RoundStatus.FAILED);
                    // mark overall as rejected / aptitude failed and complete the application
                    application.setOverallStatus(Application.ApplicationStatus.REJECTED);
                    application.setCurrentRound(Application.Round.COMPLETED);
                }
                break;
            case "TECHNICAL":
                application.setTechnicalScore(score);
                application.setTechnicalStatus(score >= 40 ? Application.RoundStatus.PASSED : Application.RoundStatus.FAILED);
                moveToNextAssessmentRound(application, Application.Round.TECHNICAL);
                break;
            case "INTERVIEW":
                application.setInterviewScore(score);
                application.setInterviewStatus(score >= 40 ? Application.RoundStatus.PASSED : Application.RoundStatus.FAILED);
                application.setCurrentRound(Application.Round.COMPLETED);
                application.setOverallStatus(Application.ApplicationStatus.COMPLETED);
                break;
        }

        Application saved = applicationRepository.save(application);
        logger.info("Score submitted for application: ID={}, Round={}, Score={}", applicationId, round, score);
        return toApplicationResponse(saved);
    }

    private void moveToNextAssessmentRound(Application application, Application.Round currentRound) {
        JobDetailsResponse jobDetails = microserviceClient.getJobDetails(application.getJobId());
        if (jobDetails == null) {
            return;
        }

        if (currentRound == Application.Round.APTITUDE && jobDetails.jobRounds().technicalEnabled()) {
            application.setCurrentRound(Application.Round.TECHNICAL);
            application.setTechnicalStatus(Application.RoundStatus.NOT_STARTED);
        } else if (currentRound == Application.Round.TECHNICAL && jobDetails.jobRounds().interviewEnabled()) {
            application.setCurrentRound(Application.Round.INTERVIEW);
            application.setInterviewStatus(Application.RoundStatus.NOT_STARTED);
        } else {
            application.setCurrentRound(Application.Round.COMPLETED);
            application.setOverallStatus(Application.ApplicationStatus.COMPLETED);
        }
    }

    // ===== 7. Get Application Details =====
    public ApplicationResponse getApplication(Long applicationId) {
        return applicationRepository.findById(applicationId)
                .map(this::toApplicationResponse)
                .orElse(null);
    }

    public List<ApplicationResponse> getApplicationsByCandidate(String candidateId) {
        return applicationRepository.findByCandidateId(candidateId)
                .stream()
                .map(this::toApplicationResponse)
                .toList();
    }

    public List<ApplicationResponse> getApplicationsByJob(Long jobId) {
        return applicationRepository.findByJobId(jobId)
                .stream()
                .map(this::toApplicationResponse)
                .toList();
    }

    public Long getApplicantsCount(Long jobId) {
        return applicationRepository.countByJobId(jobId);
    }

    // ===== Helper Methods =====
    private ApplicationResponse toApplicationResponse(Application application) {
        return new ApplicationResponse(
                application.getId(),
                application.getJobId(),
                application.getCandidateId(),
                application.getCandidateEmail(),
                application.getResumePath(),
                application.getResumeStatus() != null ? application.getResumeStatus().toString() : null,
                application.getResumeScore(),
                application.getCurrentRound().toString(),
                application.getOverallStatus().toString(),
                application.getAptitudeStatus() != null ? application.getAptitudeStatus().toString() : null,
                application.getTechnicalStatus() != null ? application.getTechnicalStatus().toString() : null,
                application.getInterviewStatus() != null ? application.getInterviewStatus().toString() : null,
                application.getAptitudeScore(),
                application.getTechnicalScore(),
                application.getInterviewScore(),
                application.getCreatedAt(),
                application.getUpdatedAt()
        );
    }

    public record ApplicationRoundResponse(
            Long applicationId,
            String round,
            String status,
            List<?> questions
    ) {}

    private void validateResumeCanBeUpdated(Application application) {
        boolean resumeFinalized = application.getResumeScore() != null
                || application.getResumeStatus() == Application.ResumeStatus.SHORTLISTED
                || application.getResumeStatus() == Application.ResumeStatus.REJECTED
                || application.getOverallStatus() == Application.ApplicationStatus.RESUME_REJECTED;

        if (resumeFinalized) {
            throw new IllegalStateException("Resume has already been uploaded for this application");
        }
    }

    private List<String> parseTopics(String topics) {
        if (topics == null || topics.isBlank()) {
            return List.of();
        }

        return java.util.Arrays.stream(topics.split(","))
                .map(String::trim)
                .filter(topic -> !topic.isBlank())
                .toList();
    }
}
