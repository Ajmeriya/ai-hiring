package com.aihiring.applicationservice.dto;

import java.util.List;

public record CodingQuestionAssignResponse(
        Long applicationId,
        Long jobId,
        Integer dsaCount,
        Integer sqlCount,
        List<CodingQuestionResponse> questions
) {}
