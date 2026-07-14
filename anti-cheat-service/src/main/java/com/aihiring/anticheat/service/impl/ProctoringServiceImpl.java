package com.aihiring.anticheat.service.impl;

import com.aihiring.anticheat.dto.AntiCheatEventRequest;
import com.aihiring.anticheat.dto.AssessmentSecurityReportResponse;
import com.aihiring.anticheat.dto.CandidateTrustSummaryResponse;
import com.aihiring.anticheat.dto.CreateProctoringSessionRequest;
import com.aihiring.anticheat.entity.AntiCheatEvent;
import com.aihiring.anticheat.entity.ProctoringSession;
import com.aihiring.anticheat.entity.TrustScore;
import com.aihiring.anticheat.enums.AssessmentType;
import com.aihiring.anticheat.enums.SessionStatus;
import com.aihiring.anticheat.exception.InvalidSessionStateException;
import com.aihiring.anticheat.exception.SessionNotFoundException;
import com.aihiring.anticheat.exception.TrustScoreCalculationException;
import com.aihiring.anticheat.repository.AntiCheatEventRepository;
import com.aihiring.anticheat.repository.ProctoringSessionRepository;
import com.aihiring.anticheat.repository.TrustScoreRepository;
import com.aihiring.anticheat.service.ProctoringService;
import com.aihiring.anticheat.util.TrustScoreRules;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProctoringServiceImpl implements ProctoringService {

    private final ProctoringSessionRepository sessionRepository;
    private final AntiCheatEventRepository eventRepository;
    private final TrustScoreRepository trustScoreRepository;
    private final Clock clock;

    @Override
    @Transactional
    public ProctoringSession createSession(CreateProctoringSessionRequest request) {
        ProctoringSession session = ProctoringSession.builder()
                .id(UUID.randomUUID())
                .candidateId(request.candidateId())
                .assessmentId(request.assessmentId())
                .assessmentType(request.assessmentType())
                .startTime(Instant.now(clock))
                .status(SessionStatus.ACTIVE)
                .build();
        return sessionRepository.save(session);
    }

    @Override
    @Transactional(readOnly = true)
    public ProctoringSession getSession(UUID sessionId) {
        return findSession(sessionId);
    }

    @Override
    @Transactional
    public ProctoringSession completeSession(UUID sessionId) {
        ProctoringSession session = findSession(sessionId);
        if (session.getStatus() == SessionStatus.COMPLETED) {
            throw new InvalidSessionStateException("Session is already completed: " + sessionId);
        }

        session.setStatus(SessionStatus.COMPLETED);
        session.setEndTime(Instant.now(clock));
        ProctoringSession savedSession = sessionRepository.save(session);
        calculateTrustScore(sessionId);
        return savedSession;
    }

    @Override
    @Transactional
    public AntiCheatEvent logEvent(AntiCheatEventRequest request) {
        ProctoringSession session = findSession(request.sessionId());
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new InvalidSessionStateException("Events are accepted only for ACTIVE sessions: " + session.getId());
        }

        String normalizedEventType = normalizeEventType(request.eventType());
        AntiCheatEvent event = AntiCheatEvent.builder()
                .id(UUID.randomUUID())
                .sessionId(session.getId())
                .eventType(normalizedEventType)
                .timestamp(Instant.now(clock))
                .metadata(request.metadata().trim())
                .build();

        AntiCheatEvent savedEvent = eventRepository.save(event);
        calculateTrustScore(session.getId());
        return savedEvent;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AntiCheatEvent> getEventsBySession(UUID sessionId) {
        findSession(sessionId);
        return eventRepository.findBySessionIdOrderByTimestampAsc(sessionId);
    }

    @Override
    @Transactional
    public TrustScore calculateTrustScore(UUID sessionId) {
        try {
            ProctoringSession session = findSession(sessionId);
            List<AntiCheatEvent> events = eventRepository.findBySessionIdOrderByTimestampAsc(sessionId);
            int score = TrustScoreRules.calculateScore(events);

            TrustScore trustScore = trustScoreRepository.findBySessionId(sessionId)
                    .orElseGet(TrustScore::new);
            trustScore.setId(trustScore.getId() == null ? UUID.randomUUID() : trustScore.getId());
            trustScore.setSessionId(sessionId);
            trustScore.setCandidateId(session.getCandidateId());
            trustScore.setAssessmentId(session.getAssessmentId());
            trustScore.setScore(score);
            trustScore.setCalculatedAt(Instant.now(clock));

            return trustScoreRepository.save(trustScore);
        } catch (SessionNotFoundException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new TrustScoreCalculationException("Unable to calculate trust score for session: " + sessionId, exception);
        }
    }

    @Override
    @Transactional
    public TrustScore getTrustScore(UUID sessionId) {
        return trustScoreRepository.findBySessionId(sessionId)
                .orElseGet(() -> calculateTrustScore(sessionId));
    }

    @Override
    @Transactional
    public AssessmentSecurityReportResponse getSecurityReport(UUID sessionId) {
        ProctoringSession session = findSession(sessionId);
        List<AntiCheatEvent> events = eventRepository.findBySessionIdOrderByTimestampAsc(sessionId);
        TrustScore trustScore = getTrustScore(sessionId);

        return new AssessmentSecurityReportResponse(
                session.getId(),
                session.getCandidateId(),
                session.getAssessmentId(),
                session.getAssessmentType(),
                trustScore.getScore(),
                events.size(),
                countEvents(events, "TAB_SWITCH"),
                countEvents(events, "FULLSCREEN_EXIT"),
                countEvents(events, "PASTE_ATTEMPT"),
                countEvents(events, "COPY_ATTEMPT"),
                countEvents(events, "CUT_ATTEMPT"),
                countEvents(events, "RIGHT_CLICK_ATTEMPT"));
    }

    @Override
    @Transactional
    public CandidateTrustSummaryResponse getCandidateTrustSummary(Long candidateId) {
        List<ProctoringSession> completedSessions = sessionRepository.findByCandidateIdAndStatus(candidateId, SessionStatus.COMPLETED);
        if (completedSessions.isEmpty()) {
            return new CandidateTrustSummaryResponse(candidateId, 0, 0, 0);
        }

        Map<UUID, AssessmentType> assessmentTypeBySessionId = completedSessions.stream()
                .collect(Collectors.toMap(ProctoringSession::getId, ProctoringSession::getAssessmentType));

        List<TrustScore> trustScores = completedSessions.stream()
                .map(session -> calculateTrustScore(session.getId()))
                .toList();

        int aptitudeTrustScore = averageScore(trustScores.stream()
                .filter(score -> assessmentTypeBySessionId.get(score.getSessionId()) == AssessmentType.APTITUDE)
                .toList());

        int dsaSqlTrustScore = averageScore(trustScores.stream()
                .filter(score -> assessmentTypeBySessionId.get(score.getSessionId()) == AssessmentType.DSA_SQL)
                .toList());

        int overallTrustScore = averageScore(trustScores);

        return new CandidateTrustSummaryResponse(candidateId, aptitudeTrustScore, dsaSqlTrustScore, overallTrustScore);
    }

    private ProctoringSession findSession(UUID sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new SessionNotFoundException(sessionId));
    }

    private String normalizeEventType(String eventType) {
        return eventType == null ? null : eventType.trim().toUpperCase(Locale.ROOT);
    }

    private int countEvents(List<AntiCheatEvent> events, String eventType) {
        return (int) events.stream()
                .filter(event -> eventType.equalsIgnoreCase(event.getEventType()))
                .count();
    }

    private int averageScore(List<TrustScore> trustScores) {
        if (trustScores.isEmpty()) {
            return 0;
        }

        double average = trustScores.stream()
                .mapToInt(TrustScore::getScore)
                .average()
                .orElse(0.0);
        return (int) Math.round(average);
    }
}