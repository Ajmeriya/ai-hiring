package com.aihiring.applicationservice.dto;

public record ResumeCheckRequest(
        Long applicationId,
        String resumePath,
        String jobDescription,
        String requiredSkills
) {}
