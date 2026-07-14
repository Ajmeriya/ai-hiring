package com.aihiring.anticheat.exception;

public class TrustScoreCalculationException extends RuntimeException {

    public TrustScoreCalculationException(String message) {
        super(message);
    }

    public TrustScoreCalculationException(String message, Throwable cause) {
        super(message, cause);
    }
}