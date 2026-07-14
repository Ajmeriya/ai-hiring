package com.aihiring.anticheat.controller;

import com.aihiring.anticheat.dto.AntiCheatEventRequest;
import com.aihiring.anticheat.dto.AntiCheatEventResponse;
import com.aihiring.anticheat.dto.AssessmentSecurityReportResponse;
import com.aihiring.anticheat.dto.CandidateTrustSummaryResponse;
import com.aihiring.anticheat.dto.CreateProctoringSessionRequest;
import com.aihiring.anticheat.dto.CreateProctoringSessionResponse;
import com.aihiring.anticheat.dto.SessionResponse;
import com.aihiring.anticheat.dto.TrustScoreResponse;
import com.aihiring.anticheat.entity.AntiCheatEvent;
import com.aihiring.anticheat.entity.ProctoringSession;
import com.aihiring.anticheat.entity.TrustScore;
import com.aihiring.anticheat.mapper.ProctoringMapper;
import com.aihiring.anticheat.service.ProctoringService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/proctoring")
@RequiredArgsConstructor
public class ProctoringController {

    private final ProctoringService proctoringService;
    private final ProctoringMapper mapper;

    @PostMapping("/sessions")
    public ResponseEntity<CreateProctoringSessionResponse> createSession(
            @Valid @RequestBody CreateProctoringSessionRequest request) {
        ProctoringSession session = proctoringService.createSession(request);
        return ResponseEntity.ok(mapper.toCreateSessionResponse(session));
    }

    @GetMapping("/sessions/{id}")
    public ResponseEntity<SessionResponse> getSession(@PathVariable UUID id) {
        return ResponseEntity.ok(mapper.toSessionResponse(proctoringService.getSession(id)));
    }

    @PutMapping("/sessions/{id}/complete")
    public ResponseEntity<SessionResponse> completeSession(@PathVariable UUID id) {
        return ResponseEntity.ok(mapper.toSessionResponse(proctoringService.completeSession(id)));
    }

    @PostMapping("/events")
    public ResponseEntity<AntiCheatEventResponse> logEvent(@Valid @RequestBody AntiCheatEventRequest request) {
        AntiCheatEvent event = proctoringService.logEvent(request);
        return ResponseEntity.ok(mapper.toEventResponse(event));
    }

    @GetMapping("/events/session/{sessionId}")
    public ResponseEntity<List<AntiCheatEventResponse>> getSessionEvents(@PathVariable UUID sessionId) {
        List<AntiCheatEventResponse> response = proctoringService.getEventsBySession(sessionId).stream()
                .map(mapper::toEventResponse)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/trust-score/{sessionId}")
    public ResponseEntity<TrustScoreResponse> getTrustScore(@PathVariable UUID sessionId) {
        TrustScore trustScore = proctoringService.getTrustScore(sessionId);
        return ResponseEntity.ok(mapper.toTrustScoreResponse(trustScore));
    }

    @GetMapping("/report/{sessionId}")
    public ResponseEntity<AssessmentSecurityReportResponse> getSecurityReport(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(proctoringService.getSecurityReport(sessionId));
    }

    @GetMapping("/candidates/{candidateId}/trust-summary")
    public ResponseEntity<CandidateTrustSummaryResponse> getCandidateTrustSummary(@PathVariable Long candidateId) {
        return ResponseEntity.ok(proctoringService.getCandidateTrustSummary(candidateId));
    }
}