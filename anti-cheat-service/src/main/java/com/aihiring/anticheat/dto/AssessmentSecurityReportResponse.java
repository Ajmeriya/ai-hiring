package com.aihiring.anticheat.dto;

import com.aihiring.anticheat.enums.AssessmentType;
import java.util.UUID;

public record AssessmentSecurityReportResponse(
        UUID sessionId,
        Long candidateId,
        Long assessmentId,
        AssessmentType assessmentType,
        Integer trustScore,
        Integer totalEvents,
        Integer tabSwitches,
        Integer fullscreenExits,
        Integer pasteAttempts,
        Integer copyAttempts,
        Integer cutAttempts,
        Integer rightClickAttempts) {
}