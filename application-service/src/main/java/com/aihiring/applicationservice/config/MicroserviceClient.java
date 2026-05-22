package com.aihiring.applicationservice.config;

import com.aihiring.applicationservice.dto.JobDetailsResponse;
import com.aihiring.applicationservice.dto.ResumeCheckResponse;
import com.aihiring.applicationservice.dto.AptitudeQuestionResponse;
import com.aihiring.applicationservice.dto.TechnicalQuestionResponse;
import com.aihiring.applicationservice.dto.InterviewQuestionResponse;
import com.aihiring.applicationservice.dto.ResumeCheckRequest;
import com.aihiring.applicationservice.dto.AIEvaluationResponse;
import com.aihiring.applicationservice.dto.AptitudeQuestionBatchResponse;
import com.aihiring.applicationservice.dto.AptitudeQuestionRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@Component
public class MicroserviceClient {

    private static final Logger logger = LoggerFactory.getLogger(MicroserviceClient.class);

    @Autowired
    private RestTemplate restTemplate;

    private static final String JOB_SERVICE_URL = "http://localhost:8082";
    private static final String RESUME_CHECKER_URL = "http://localhost:8084";
    private static final String AI_SERVICE_URL = "http://localhost:8085";
    private static final String QUESTION_SERVICE_URL = "http://localhost:8086";

    // ===== Job Service Calls =====
    public JobDetailsResponse getJobDetails(Long jobId) {
        try {
            String url = JOB_SERVICE_URL + "/api/jobs/" + jobId;
            return restTemplate.getForObject(url, JobDetailsResponse.class);
        } catch (Exception e) {
            logger.error("Failed to fetch job details from job-service for jobId: " + jobId, e);
            return null;
        }
    }

    // ===== Resume Checker Service Calls =====
    public ResumeCheckResponse checkResume(Long applicationId, String resumePath, String jobDescription, String requiredSkills) {
        try {
            String url = RESUME_CHECKER_URL + "/api/resume-checker/check";
            ResumeCheckRequest request = new ResumeCheckRequest(applicationId, resumePath, jobDescription, requiredSkills);
            return restTemplate.postForObject(url, request, ResumeCheckResponse.class);
        } catch (Exception e) {
            logger.error("Failed to check resume from resume-checker service", e);
            return null;
        }
    }

    public List<TechnicalQuestionResponse> getTechnicalQuestions(Integer dsaCount, String dsaTopics, Integer sqlCount, String sqlTopics) {
        try {
            String url = AI_SERVICE_URL + "/api/questions/technical?dsaCount=" + dsaCount + "&dsaTopics=" + dsaTopics
                    + "&sqlCount=" + sqlCount + "&sqlTopics=" + sqlTopics;
            TechnicalQuestionResponse[] questions = restTemplate.getForObject(url, TechnicalQuestionResponse[].class);
            return questions != null ? List.of(questions) : List.of();
        } catch (Exception e) {
            logger.error("Failed to fetch technical questions from ai-service", e);
            return List.of();
        }
    }

    public List<InterviewQuestionResponse> getInterviewQuestions(String topics) {
        try {
            String url = AI_SERVICE_URL + "/api/questions/interview?topics=" + topics;
            InterviewQuestionResponse[] questions = restTemplate.getForObject(url, InterviewQuestionResponse[].class);
            return questions != null ? List.of(questions) : List.of();
        } catch (Exception e) {
            logger.error("Failed to fetch interview questions from ai-service", e);
            return List.of();
        }
    }

    // ===== AI Service - Resume Evaluation =====
    /**
     * Evaluate resume using AI Service hybrid scoring engine
     * Calls POST /evaluate with multipart form data
     * 
     * @param resumeFile The resume file (PDF or text)
     * @param jobDescription Job description text
     * @param requiredSkills Comma-separated required skills
     * @param requiredYears Required years of experience
     * @return AIEvaluationResponse with scores and decision, or null if failed
     */
    public AIEvaluationResponse evaluateResume(MultipartFile resumeFile, String jobDescription, 
                                               String requiredSkills, Integer requiredYears) {
        try {
            String url = AI_SERVICE_URL + "/evaluate";
            
            // Create multipart form data
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            try {
                // Add resume file from byte array - this works better with RestTemplate
                body.add("resume_file", new org.springframework.core.io.ByteArrayResource(resumeFile.getBytes()) {
                    @Override
                    public String getFilename() {
                        return resumeFile.getOriginalFilename();
                    }
                });
            } catch (Exception e) {
                logger.error("Failed to add resume file to multipart request", e);
                return null;
            }
            
            body.add("job_description", jobDescription);
            body.add("required_skills", requiredSkills != null ? requiredSkills : "");
            body.add("required_years", requiredYears != null ? requiredYears : 0);
            
            // Set headers for multipart
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            
            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            
            logger.info("Calling AI Service to evaluate resume: {}", resumeFile.getOriginalFilename());
            AIEvaluationResponse response = restTemplate.postForObject(url, requestEntity, AIEvaluationResponse.class);
            
            if (response != null) {
                logger.info("Resume evaluated successfully from ai-service. Score: {}, Decision: {}", 
                        response.finalScore(), response.decision());
            } else {
                logger.warn("AI Service returned null response for resume evaluation");
            }
            return response;
        } catch (Exception e) {
            logger.error("Failed to evaluate resume from ai-service", e);
            return null;
        }
    }

    // ===== Aptitude Question Service =====
    public AptitudeQuestionBatchResponse getAptitudeQuestions(AptitudeQuestionRequest request) {
        try {
            String url = QUESTION_SERVICE_URL + "/api/aptitude/questions/assign";
            return restTemplate.postForObject(url, request, AptitudeQuestionBatchResponse.class);
        } catch (Exception e) {
            logger.error("Failed to fetch aptitude questions from question-service", e);
            return null;
        }
    }
}
