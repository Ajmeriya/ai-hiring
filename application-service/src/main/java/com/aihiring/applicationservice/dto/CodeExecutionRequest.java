package com.aihiring.applicationservice.dto;

import java.util.List;

public record CodeExecutionRequest(
        String language,
        String code,
        List<CodeExecutionTestCase> testCases,
        Integer timeoutSeconds
) {}
