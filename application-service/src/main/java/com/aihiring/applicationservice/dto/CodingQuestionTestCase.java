package com.aihiring.applicationservice.dto;

public record CodingQuestionTestCase(
        Long id,
        String inputData,
        String expectedOutput,
        Boolean hidden
) {}
