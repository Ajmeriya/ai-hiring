package com.aihiring.applicationservice.dto;

import java.util.List;

public record AptitudeQuestionRequest(
        Long applicationId,
        Long jobId,
        Integer count,
        String jobTitle,
        String jobDescription,
        List<String> requiredSkills,
        List<String> topics,
        String difficulty,
        String aptitudeType,
        Integer aptitudeTime,
        String recruiterTopicsRaw
) {}
