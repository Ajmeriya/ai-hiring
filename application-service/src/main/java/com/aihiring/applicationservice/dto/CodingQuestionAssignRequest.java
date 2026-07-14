package com.aihiring.applicationservice.dto;

import java.util.List;

public record CodingQuestionAssignRequest(
        Long applicationId,
        Long jobId,
        Integer dsaCount,
        List<String> dsaTopics,
        String dsaDifficulty,
        Integer sqlCount,
        List<String> sqlTopics,
        String sqlDifficulty
) {}
