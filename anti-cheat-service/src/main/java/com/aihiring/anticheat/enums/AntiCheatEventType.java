package com.aihiring.anticheat.enums;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

public enum AntiCheatEventType {
    TAB_SWITCH,
    WINDOW_BLUR,
    WINDOW_FOCUS,
    FULLSCREEN_ENTER,
    FULLSCREEN_EXIT,
    COPY_ATTEMPT,
    PASTE_ATTEMPT,
    CUT_ATTEMPT,
    RIGHT_CLICK_ATTEMPT,
    MULTIPLE_FACE_DETECTED,
    NO_FACE_DETECTED,
    PHONE_DETECTED,
    AUDIO_ACTIVITY_DETECTED,
    LOOKING_AWAY;

    public static Optional<AntiCheatEventType> fromValue(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }

        String normalized = value.trim().toUpperCase(Locale.ROOT);
        return Arrays.stream(values())
                .filter(eventType -> eventType.name().equals(normalized))
                .findFirst();
    }
}