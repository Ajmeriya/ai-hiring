package com.aihiring.anticheat.exception;

import java.util.UUID;

public class SessionNotFoundException extends RuntimeException {

    public SessionNotFoundException(UUID sessionId) {
        super("Proctoring session not found: " + sessionId);
    }
}