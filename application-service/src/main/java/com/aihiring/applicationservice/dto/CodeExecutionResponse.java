package com.aihiring.applicationservice.dto;

import java.util.List;

public record CodeExecutionResponse(
        Integer passed,
        Integer total,
        String verdict,
        String stderr,
        String stdout,
        Integer executionTimeMs,
        List<CodeExecutionTestResult> results
) {}
