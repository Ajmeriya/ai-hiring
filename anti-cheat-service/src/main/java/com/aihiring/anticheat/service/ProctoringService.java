package com.aihiring.anticheat.service;

import com.aihiring.anticheat.dto.AntiCheatEventRequest;
import com.aihiring.anticheat.dto.AssessmentSecurityReportResponse;
import com.aihiring.anticheat.dto.CandidateTrustSummaryResponse;
import com.aihiring.anticheat.dto.CreateProctoringSessionRequest;
import com.aihiring.anticheat.entity.AntiCheatEvent;
import com.aihiring.anticheat.entity.ProctoringSession;
import com.aihiring.anticheat.entity.TrustScore;
import java.util.List;
import java.util.UUID;

public interface ProctoringService {

    ProctoringSession createSession(CreateProctoringSessionRequest request);

    ProctoringSession getSession(UUID sessionId);

    ProctoringSession completeSession(UUID sessionId);

    AntiCheatEvent logEvent(AntiCheatEventRequest request);

    List<AntiCheatEvent> getEventsBySession(UUID sessionId);

    TrustScore calculateTrustScore(UUID sessionId);

    TrustScore getTrustScore(UUID sessionId);

    AssessmentSecurityReportResponse getSecurityReport(UUID sessionId);

    CandidateTrustSummaryResponse getCandidateTrustSummary(Long candidateId);
}