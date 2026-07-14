package com.aihiring.applicationservice.dto;

import java.util.List;

public record TechnicalSubmissionRequest(
        String language,
        List<QuestionSubmission> questions
) {
    public record QuestionSubmission(
            Long questionId,
            String language,
            String code
    ) {}
}
