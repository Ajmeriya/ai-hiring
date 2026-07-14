package com.aihiring.anticheat.dto;

import com.aihiring.anticheat.enums.AssessmentType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateProctoringSessionRequest(
        @NotNull @Positive Long candidateId,
        @NotNull @Positive Long assessmentId,
        @NotNull AssessmentType assessmentType) {
}