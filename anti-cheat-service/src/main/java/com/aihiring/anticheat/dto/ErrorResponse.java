package com.aihiring.anticheat.dto;

public record ErrorResponse(
        String timestamp,
        int status,
        String message,
        String path) {
}