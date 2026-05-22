package com.aihiring.applicationservice.dto;

import java.util.List;

public record TechnicalQuestionResponse(
        Long id,
        String question,
        String description,
        String expectedOutput,
        String difficulty,
        String category,
        List<String> testCases
) {}
