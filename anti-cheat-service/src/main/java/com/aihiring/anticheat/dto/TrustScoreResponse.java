package com.aihiring.anticheat.dto;

import java.util.UUID;

public record TrustScoreResponse(
        UUID sessionId,
        Long candidateId,
        Long assessmentId,
        Integer score) {
}