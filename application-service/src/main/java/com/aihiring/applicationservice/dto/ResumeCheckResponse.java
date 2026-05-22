package com.aihiring.applicationservice.dto;

public record ResumeCheckResponse(
        Long applicationId,
        boolean shortlisted,
        Float score,
        String feedback
) {}
