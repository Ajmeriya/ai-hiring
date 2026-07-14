package com.aihiring.applicationservice.dto;

public record TechnicalRunRequest(
        Long questionId,
        String language,
        String code
) {}
