package com.aihiring.applicationservice.dto;

import java.util.List;

public record AptitudeQuestionBatchResponse(
        Long applicationId,
        Long jobId,
        Integer count,
        Integer poolSize,
        Integer bankSize,
        Integer generatedCount,
        List<AptitudeQuestionResponse> questions
) {}
