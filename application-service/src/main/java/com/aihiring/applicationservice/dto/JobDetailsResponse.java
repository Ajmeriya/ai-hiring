package com.aihiring.applicationservice.dto;

import java.util.List;

// Job Details from Job Service
public record JobDetailsResponse(
        Long id,
        String title,
        String company,
        String department,
        String salary,
        String description,
        String status,
        List<String> skills,
        JobRoundsResponse jobRounds,
        AptitudeConfigResponse aptitudeConfig,
        TechnicalConfigResponse technicalConfig,
        InterviewConfigResponse interviewConfig
) {

    public record JobRoundsResponse(
            boolean aptitudeEnabled,
            boolean technicalEnabled,
            boolean interviewEnabled
    ) {}

    public record AptitudeConfigResponse(
            Integer numQuestions,
            String topics,
            String type,
            Integer time
    ) {}

    public record TechnicalConfigResponse(
            Integer dsaQuestions,
            String dsaTopics,
            Integer sqlQuestions,
            String sqlTopics,
            Integer time
    ) {}

    public record InterviewConfigResponse(
            Integer duration,
            String topics
    ) {}
}
