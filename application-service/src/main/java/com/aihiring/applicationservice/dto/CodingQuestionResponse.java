package com.aihiring.applicationservice.dto;

import java.util.List;

public record CodingQuestionResponse(
        Long id,
        String title,
        String statement,
        String topic,
        String difficulty,
        List<String> tags,
        String constraintsText,
        String inputFormat,
        String outputFormat,
        String starterCodeCpp,
        String starterCodeJava,
        String starterCodePython,
        String starterCodeSql,
        String solutionCode,
        Integer timeLimitMs,
        Integer memoryLimitMb,
        List<CodingQuestionTestCase> visibleTestCases
) {}
