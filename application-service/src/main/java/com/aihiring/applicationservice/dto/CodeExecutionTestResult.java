package com.aihiring.applicationservice.dto;

public record CodeExecutionTestResult(
        String inputData,
        String expectedOutput,
        String actualOutput,
        Boolean passed,
        Boolean hidden,
        String stderr
) {}
