package com.aihiring.anticheat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "trust_scores", indexes = {
        @Index(name = "idx_trust_scores_session_id", columnList = "session_id"),
        @Index(name = "idx_trust_scores_candidate_id", columnList = "candidate_id"),
        @Index(name = "idx_trust_scores_assessment_id", columnList = "assessment_id")
})
public class TrustScore {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "session_id", nullable = false, unique = true)
    private UUID sessionId;

    @Column(name = "candidate_id", nullable = false)
    private Long candidateId;

    @Column(name = "assessment_id", nullable = false)
    private Long assessmentId;

    @Column(nullable = false)
    private Integer score;

    @Column(name = "calculated_at", nullable = false)
    private Instant calculatedAt;
}