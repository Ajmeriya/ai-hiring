package com.aihiring.applicationservice.dto;

public record CodeExecutionTestCase(
        String inputData,
        String expectedOutput,
        Boolean hidden
) {}
