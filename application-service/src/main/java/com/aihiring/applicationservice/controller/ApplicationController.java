package com.aihiring.applicationservice.controller;

import com.aihiring.applicationservice.dto.ApplicationResponse;
import com.aihiring.applicationservice.dto.CreateApplicationRequest;
import com.aihiring.applicationservice.dto.TechnicalRunRequest;
import com.aihiring.applicationservice.dto.TechnicalSubmissionRequest;
import com.aihiring.applicationservice.service.ApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    // ===== 1. Create Application =====
    @PostMapping
    public ResponseEntity<ApplicationResponse> createApplication(
            @Valid @RequestBody CreateApplicationRequest request,
            Authentication authentication) {
        ApplicationResponse response = applicationService.createApplication(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ===== 2. Submit Resume =====
    @PostMapping("/{id}/resume")
    public ResponseEntity<ApplicationResponse> submitResume(
            @PathVariable Long id,
            @RequestParam String resumePath,
            Authentication authentication) {
        ApplicationResponse response = applicationService.submitResume(id, resumePath);
        if (response == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    // ===== 3. Check Resume =====
    @PostMapping("/{id}/check-resume")
    public ResponseEntity<ApplicationResponse> checkResume(
            @PathVariable Long id,
            Authentication authentication) {
        ApplicationResponse response = applicationService.checkResume(id);
        if (response == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    // ===== 3B. Evaluate Resume with AI Service =====
    /**
     * Evaluates resume using AI Service hybrid scoring engine
     * Accepts multipart form with resume file
     * Returns detailed evaluation with score, decision, and insights
     */
    @PostMapping("/{id}/evaluate-resume-ai")
    public ResponseEntity<ApplicationResponse> evaluateResumeWithAI(
            @PathVariable Long id,
            @RequestParam("resume_file") MultipartFile resumeFile,
            Authentication authentication) {
        if (resumeFile.isEmpty()) {
            return ResponseEntity.badRequest().body(null);
        }
        
        ApplicationResponse response = applicationService.evaluateResumeWithAI(id, resumeFile);
        if (response == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    // ===== 4. Start Aptitude Round =====
    @PostMapping("/{id}/round/aptitude/start")
    public ResponseEntity<?> startAptitudeRound(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            var response = applicationService.startAptitudeRound(id);
            if (response == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Aptitude start failed: application not found, aptitude config unavailable, or question-service returned no questions."));
            }
            return ResponseEntity.ok(response);
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Aptitude start failed unexpectedly."));
        }
    }

    // ===== 5. Start Technical Round =====
    @PostMapping("/{id}/round/technical/start")
    public ResponseEntity<?> startTechnicalRound(
            @PathVariable Long id,
            Authentication authentication) {
        var response = applicationService.startTechnicalRound(id);
        if (response == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    // ===== 5B. Run Technical Question =====
    @PostMapping("/{id}/round/technical/run")
    public ResponseEntity<?> runTechnicalQuestion(
            @PathVariable Long id,
            @RequestBody TechnicalRunRequest request,
            Authentication authentication) {
        var response = applicationService.runTechnicalQuestion(id, request);
        if (response == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    // ===== 5C. Submit Technical Round =====
    @PostMapping("/{id}/round/technical/submit")
    public ResponseEntity<?> submitTechnicalRound(
            @PathVariable Long id,
            @RequestBody TechnicalSubmissionRequest request,
            Authentication authentication) {
        var response = applicationService.submitTechnicalRound(id, request);
        if (response == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    // ===== 6. Start Interview Round =====
    @PostMapping("/{id}/round/interview/start")
    public ResponseEntity<?> startInterviewRound(
            @PathVariable Long id,
            Authentication authentication) {
        var response = applicationService.startInterviewRound(id);
        if (response == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    // ===== 7. Submit Round Score =====
    @PostMapping("/{id}/round/{round}/submit-score")
    public ResponseEntity<ApplicationResponse> submitRoundScore(
            @PathVariable Long id,
            @PathVariable String round,
            @RequestParam Float score,
            Authentication authentication) {
        ApplicationResponse response = applicationService.submitRoundScore(id, round, score);
        if (response == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    // ===== 8. Get Application Details =====
    @GetMapping("/{id}")
    public ResponseEntity<ApplicationResponse> getApplication(
            @PathVariable Long id,
            Authentication authentication) {
        ApplicationResponse response = applicationService.getApplication(id);
        if (response == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    // ===== 9. Get Applications by Job =====
    @GetMapping("/job/{jobId}")
    public ResponseEntity<List<ApplicationResponse>> getApplicationsByJob(
            @PathVariable Long jobId) {
        List<ApplicationResponse> responses = applicationService.getApplicationsByJob(jobId);
        return ResponseEntity.ok(responses);
    }

    // ===== 9B. Get Applicants Count for Job (Public) =====
    @GetMapping("/job/{jobId}/count")
    public ResponseEntity<Long> getApplicantsCount(
            @PathVariable Long jobId) {
        Long count = applicationService.getApplicantsCount(jobId);
        return ResponseEntity.ok(count);
    }

    // ===== 10. Get Applications by Candidate =====
    @GetMapping("/candidate/{candidateId}")
    public ResponseEntity<List<ApplicationResponse>> getApplicationsByCandidate(
            @PathVariable String candidateId,
            Authentication authentication) {
        List<ApplicationResponse> responses = applicationService.getApplicationsByCandidate(candidateId);
        return ResponseEntity.ok(responses);
    }
}
