package com.aihiring.anticheat.dto;

import com.aihiring.anticheat.enums.AssessmentType;
import com.aihiring.anticheat.enums.SessionStatus;
import java.time.Instant;
import java.util.UUID;

public record SessionResponse(
        UUID sessionId,
        Long candidateId,
        Long assessmentId,
        AssessmentType assessmentType,
        Instant startTime,
        Instant endTime,
        SessionStatus status) {
}