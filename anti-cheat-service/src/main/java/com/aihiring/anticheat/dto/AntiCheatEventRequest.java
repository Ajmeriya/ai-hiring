package com.aihiring.anticheat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AntiCheatEventRequest(
        @NotNull UUID sessionId,
        @NotBlank String eventType,
        @NotBlank String metadata) {
}