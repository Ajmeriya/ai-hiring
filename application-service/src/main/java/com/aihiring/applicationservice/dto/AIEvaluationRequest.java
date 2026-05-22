package com.aihiring.applicationservice.dto;

import org.springframework.web.multipart.MultipartFile;

/**
 * DTO for AI Service evaluation request
 * Maps to the Python FastAPI request model
 */
public record AIEvaluationRequest(
    MultipartFile resumeFile,
    String jobDescription,
    String requiredSkills,
    Integer requiredYears
) {}
