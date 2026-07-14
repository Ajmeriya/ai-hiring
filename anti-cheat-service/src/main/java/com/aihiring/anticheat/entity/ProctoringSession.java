package com.aihiring.anticheat.entity;

import com.aihiring.anticheat.enums.AssessmentType;
import com.aihiring.anticheat.enums.SessionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "proctoring_sessions", indexes = {
        @Index(name = "idx_proctoring_sessions_candidate_id", columnList = "candidate_id"),
        @Index(name = "idx_proctoring_sessions_assessment_id", columnList = "assessment_id"),
        @Index(name = "idx_proctoring_sessions_status", columnList = "status")
})
public class ProctoringSession {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "candidate_id", nullable = false)
    private Long candidateId;

    @Column(name = "assessment_id", nullable = false)
    private Long assessmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "assessment_type", nullable = false, length = 32)
    private AssessmentType assessmentType;

    @Column(name = "start_time", nullable = false, updatable = false)
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private SessionStatus status;
}