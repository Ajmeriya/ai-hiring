package com.aihiring.anticheat.dto;

public record CandidateTrustSummaryResponse(
        Long candidateId,
        Integer aptitudeTrustScore,
        Integer dsaSqlTrustScore,
        Integer overallTrustScore) {
}