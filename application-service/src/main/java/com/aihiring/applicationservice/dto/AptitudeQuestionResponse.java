package com.aihiring.applicationservice.dto;

import java.util.List;

public record AptitudeQuestionResponse(
        Long id,
        String question,
        List<String> options,
        Integer correctAnswerIndex,
        String explanation,
        String topic,
        String difficulty
) {}
