package com.aihiring.anticheat.mapper;

import com.aihiring.anticheat.dto.AntiCheatEventResponse;
import com.aihiring.anticheat.dto.CreateProctoringSessionResponse;
import com.aihiring.anticheat.dto.SessionResponse;
import com.aihiring.anticheat.dto.TrustScoreResponse;
import com.aihiring.anticheat.entity.AntiCheatEvent;
import com.aihiring.anticheat.entity.ProctoringSession;
import com.aihiring.anticheat.entity.TrustScore;
import org.springframework.stereotype.Component;

@Component
public class ProctoringMapper {

    public CreateProctoringSessionResponse toCreateSessionResponse(ProctoringSession session) {
        return new CreateProctoringSessionResponse(session.getId());
    }

    public SessionResponse toSessionResponse(ProctoringSession session) {
        return new SessionResponse(
                session.getId(),
                session.getCandidateId(),
                session.getAssessmentId(),
                session.getAssessmentType(),
                session.getStartTime(),
                session.getEndTime(),
                session.getStatus());
    }

    public AntiCheatEventResponse toEventResponse(AntiCheatEvent event) {
        return new AntiCheatEventResponse(
                event.getId(),
                event.getSessionId(),
                event.getEventType(),
                event.getTimestamp(),
                event.getMetadata());
    }

    public TrustScoreResponse toTrustScoreResponse(TrustScore trustScore) {
        return new TrustScoreResponse(
                trustScore.getSessionId(),
                trustScore.getCandidateId(),
                trustScore.getAssessmentId(),
                trustScore.getScore());
    }
}