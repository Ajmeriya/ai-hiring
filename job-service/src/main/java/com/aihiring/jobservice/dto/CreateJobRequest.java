package com.aihiring.jobservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CreateJobRequest(
        @NotBlank String title,
        @NotBlank String company,
        @NotBlank String department,
        @NotBlank String salary,
        @NotBlank String description,
        Integer requiredExperienceYears,
        @NotEmpty List<@NotBlank String> skills,
        @Valid JobRoundsRequest jobRounds,
        @Valid AptitudeConfigRequest aptitudeConfig,
        @Valid TechnicalConfigRequest technicalConfig,
        @Valid InterviewConfigRequest interviewConfig
) {

    public record JobRoundsRequest(
            boolean aptitudeEnabled,
            boolean technicalEnabled,
            boolean interviewEnabled
    ) {
    }

    public record AptitudeConfigRequest(
            Integer numQuestions,
            String topics,
            String type,
            Integer time
    ) {
    }

    public record TechnicalConfigRequest(
            Integer dsaQuestions,
            String dsaTopics,
            String dsaDifficulty,
            Integer sqlQuestions,
            String sqlTopics,
            String sqlDifficulty,
            Integer time
    ) {
    }

    public record InterviewConfigRequest(
            Integer duration,
            String topics
    ) {
    }
}