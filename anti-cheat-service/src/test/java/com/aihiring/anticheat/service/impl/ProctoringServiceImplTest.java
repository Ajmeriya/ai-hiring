package com.aihiring.anticheat.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.aihiring.anticheat.dto.AntiCheatEventRequest;
import com.aihiring.anticheat.dto.AssessmentSecurityReportResponse;
import com.aihiring.anticheat.dto.CandidateTrustSummaryResponse;
import com.aihiring.anticheat.dto.CreateProctoringSessionRequest;
import com.aihiring.anticheat.entity.AntiCheatEvent;
import com.aihiring.anticheat.entity.ProctoringSession;
import com.aihiring.anticheat.entity.TrustScore;
import com.aihiring.anticheat.enums.AssessmentType;
import com.aihiring.anticheat.enums.SessionStatus;
import com.aihiring.anticheat.repository.AntiCheatEventRepository;
import com.aihiring.anticheat.repository.ProctoringSessionRepository;
import com.aihiring.anticheat.repository.TrustScoreRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProctoringServiceImplTest {

    @Mock
    private ProctoringSessionRepository sessionRepository;

    @Mock
    private AntiCheatEventRepository eventRepository;

    @Mock
    private TrustScoreRepository trustScoreRepository;

    private ProctoringServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ProctoringServiceImpl(
                sessionRepository,
                eventRepository,
                trustScoreRepository,
                Clock.fixed(Instant.parse("2026-05-30T10:15:30Z"), ZoneOffset.UTC));
    }

    @Test
    void shouldCreateActiveSessionForAptitudeRound() {
        ArgumentCaptor<ProctoringSession> captor = ArgumentCaptor.forClass(ProctoringSession.class);
        when(sessionRepository.save(any(ProctoringSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProctoringSession session = service.createSession(new CreateProctoringSessionRequest(1L, 100L, AssessmentType.APTITUDE));

        assertThat(session.getAssessmentType()).isEqualTo(AssessmentType.APTITUDE);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.ACTIVE);
        assertThat(session.getCandidateId()).isEqualTo(1L);
        assertThat(session.getAssessmentId()).isEqualTo(100L);
    }

    @Test
    void shouldCreateActiveSessionForDsaSqlRound() {
        when(sessionRepository.save(any(ProctoringSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProctoringSession session = service.createSession(new CreateProctoringSessionRequest(2L, 200L, AssessmentType.DSA_SQL));

        assertThat(session.getAssessmentType()).isEqualTo(AssessmentType.DSA_SQL);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.ACTIVE);
        assertThat(session.getCandidateId()).isEqualTo(2L);
        assertThat(session.getAssessmentId()).isEqualTo(200L);
    }

    @Test
    void shouldGenerateAptitudeSecurityReport() {
        UUID sessionId = UUID.randomUUID();
        ProctoringSession session = session(sessionId, 1L, 100L, AssessmentType.APTITUDE, SessionStatus.ACTIVE);
        List<AntiCheatEvent> events = List.of(
                event(sessionId, "TAB_SWITCH"),
                event(sessionId, "COPY_ATTEMPT"),
                event(sessionId, "PASTE_ATTEMPT"));

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(eventRepository.findBySessionIdOrderByTimestampAsc(sessionId)).thenReturn(events);
        when(trustScoreRepository.findBySessionId(sessionId)).thenReturn(Optional.of(trustScore(sessionId, 1L, 100L, 77)));

        AssessmentSecurityReportResponse report = service.getSecurityReport(sessionId);

        assertThat(report.assessmentType()).isEqualTo(AssessmentType.APTITUDE);
        assertThat(report.totalEvents()).isEqualTo(3);
        assertThat(report.tabSwitches()).isEqualTo(1);
        assertThat(report.copyAttempts()).isEqualTo(1);
        assertThat(report.pasteAttempts()).isEqualTo(1);
        assertThat(report.trustScore()).isEqualTo(77);
    }

    @Test
    void shouldGenerateDsaSqlSecurityReport() {
        UUID sessionId = UUID.randomUUID();
        ProctoringSession session = session(sessionId, 2L, 200L, AssessmentType.DSA_SQL, SessionStatus.ACTIVE);
        List<AntiCheatEvent> events = List.of(
                event(sessionId, "TAB_SWITCH"),
                event(sessionId, "RIGHT_CLICK_ATTEMPT"),
                event(sessionId, "RIGHT_CLICK_ATTEMPT"),
                event(sessionId, "FULLSCREEN_EXIT"));

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(eventRepository.findBySessionIdOrderByTimestampAsc(sessionId)).thenReturn(events);
        when(trustScoreRepository.findBySessionId(sessionId)).thenReturn(Optional.of(trustScore(sessionId, 2L, 200L, 74)));

        AssessmentSecurityReportResponse report = service.getSecurityReport(sessionId);

        assertThat(report.assessmentType()).isEqualTo(AssessmentType.DSA_SQL);
        assertThat(report.totalEvents()).isEqualTo(4);
        assertThat(report.tabSwitches()).isEqualTo(1);
        assertThat(report.fullscreenExits()).isEqualTo(1);
        assertThat(report.rightClickAttempts()).isEqualTo(2);
        assertThat(report.trustScore()).isEqualTo(74);
    }

    @Test
    void shouldSummarizeTrustAcrossBothAssessmentTypes() {
        UUID aptitudeSessionId = UUID.randomUUID();
        UUID dsaSqlSessionId = UUID.randomUUID();

        ProctoringSession aptitudeSession = session(aptitudeSessionId, 1L, 100L, AssessmentType.APTITUDE, SessionStatus.COMPLETED);
        ProctoringSession dsaSqlSession = session(dsaSqlSessionId, 1L, 200L, AssessmentType.DSA_SQL, SessionStatus.COMPLETED);

        when(sessionRepository.findByCandidateIdAndStatus(1L, SessionStatus.COMPLETED))
                .thenReturn(List.of(aptitudeSession, dsaSqlSession));
        when(sessionRepository.findById(aptitudeSessionId)).thenReturn(Optional.of(aptitudeSession));
        when(sessionRepository.findById(dsaSqlSessionId)).thenReturn(Optional.of(dsaSqlSession));
        when(eventRepository.findBySessionIdOrderByTimestampAsc(any(UUID.class))).thenReturn(List.of());
        when(trustScoreRepository.findBySessionId(any(UUID.class))).thenReturn(Optional.empty());
        when(trustScoreRepository.save(any(TrustScore.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CandidateTrustSummaryResponse summary = service.getCandidateTrustSummary(1L);

        assertThat(summary.candidateId()).isEqualTo(1L);
        assertThat(summary.aptitudeTrustScore()).isEqualTo(100);
        assertThat(summary.dsaSqlTrustScore()).isEqualTo(100);
        assertThat(summary.overallTrustScore()).isEqualTo(100);
    }

    private ProctoringSession session(UUID id, Long candidateId, Long assessmentId, AssessmentType assessmentType, SessionStatus status) {
        return ProctoringSession.builder()
                .id(id)
                .candidateId(candidateId)
                .assessmentId(assessmentId)
                .assessmentType(assessmentType)
                .startTime(Instant.parse("2026-05-30T10:15:30Z"))
                .status(status)
                .build();
    }

    private AntiCheatEvent event(UUID sessionId, String eventType) {
        return AntiCheatEvent.builder()
                .id(UUID.randomUUID())
                .sessionId(sessionId)
                .eventType(eventType)
                .timestamp(Instant.parse("2026-05-30T10:15:30Z"))
                .metadata(eventType)
                .build();
    }

    private TrustScore trustScore(UUID sessionId, Long candidateId, Long assessmentId, Integer score) {
        return TrustScore.builder()
                .id(UUID.randomUUID())
                .sessionId(sessionId)
                .candidateId(candidateId)
                .assessmentId(assessmentId)
                .score(score)
                .calculatedAt(Instant.parse("2026-05-30T10:15:30Z"))
                .build();
    }
}