package com.aihiring.applicationservice.dto;

import java.time.LocalDateTime;

public record ApplicationResponse(
        Long id,
        Long jobId,
        String candidateId,
        String candidateEmail,
        String resumePath,
        String resumeStatus,
        Float resumeScore,
        String currentRound,
        String overallStatus,
        String aptitudeStatus,
        String technicalStatus,
        String interviewStatus,
        Float aptitudeScore,
        Float technicalScore,
        Float interviewScore,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
