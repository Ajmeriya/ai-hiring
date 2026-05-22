package com.aihiring.applicationservice.dto;

import jakarta.validation.constraints.NotNull;

public record CreateApplicationRequest(
        @NotNull Long jobId,
        @NotNull String candidateId,
        String candidateEmail,
        String resumePath
) {}
