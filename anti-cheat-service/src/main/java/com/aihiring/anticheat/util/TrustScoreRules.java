package com.aihiring.anticheat.util;

import com.aihiring.anticheat.entity.AntiCheatEvent;
import java.util.Collection;

public final class TrustScoreRules {

    private TrustScoreRules() {
    }

    public static int calculateScore(Collection<AntiCheatEvent> events) {
        int score = 100;

        for (AntiCheatEvent event : events) {
            score -= deductionFor(event.getEventType());
            if (score < 0) {
                return 0;
            }
        }

        return Math.min(score, 100);
    }

    public static int deductionFor(String eventType) {
        if (eventType == null) {
            return 0;
        }

        return switch (eventType.trim().toUpperCase()) {
            case "TAB_SWITCH" -> 10;
            case "FULLSCREEN_EXIT" -> 10;
            case "PASTE_ATTEMPT" -> 10;
            case "COPY_ATTEMPT" -> 3;
            case "CUT_ATTEMPT" -> 5;
            case "RIGHT_CLICK_ATTEMPT" -> 3;
            default -> 0;
        };
    }
}