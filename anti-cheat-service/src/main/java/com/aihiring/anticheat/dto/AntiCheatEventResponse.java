package com.aihiring.anticheat.dto;

import java.time.Instant;
import java.util.UUID;

public record AntiCheatEventResponse(
        UUID id,
        UUID sessionId,
        String eventType,
        Instant timestamp,
        String metadata) {
}