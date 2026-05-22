package com.aihiring.jobservice.dto;

import jakarta.validation.Valid;

public record JobUpdateRequest(
        String status,
        @Valid CreateJobRequest.JobRoundsRequest jobRounds,
        @Valid CreateJobRequest.AptitudeConfigRequest aptitudeConfig,
        @Valid CreateJobRequest.TechnicalConfigRequest technicalConfig,
        @Valid CreateJobRequest.InterviewConfigRequest interviewConfig
) {
}
