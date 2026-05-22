package com.aihiring.applicationservice.dto;

public record InterviewQuestionResponse(
        Long id,
        String question,
        String expectedAnswer,
        String difficulty,
        String category
) {}
