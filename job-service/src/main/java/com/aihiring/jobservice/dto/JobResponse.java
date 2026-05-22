package com.aihiring.jobservice.dto;

import java.util.List;

public record JobResponse(
        Long id,
        String title,
        String company,
        String department,
        String salary,
        String description,
        Integer requiredExperienceYears,
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
    ) {
    }

    public record AptitudeConfigResponse(
            Integer numQuestions,
            String topics,
            String type,
            Integer time
    ) {
    }

    public record TechnicalConfigResponse(
            Integer dsaQuestions,
            String dsaTopics,
            String dsaDifficulty,
            Integer sqlQuestions,
            String sqlTopics,
            String sqlDifficulty,
            Integer time
    ) {
    }

    public record InterviewConfigResponse(
            Integer duration,
            String topics
    ) {
    }
}