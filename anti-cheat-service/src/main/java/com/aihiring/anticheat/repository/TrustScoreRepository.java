package com.aihiring.anticheat.repository;

import com.aihiring.anticheat.entity.TrustScore;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrustScoreRepository extends JpaRepository<TrustScore, UUID> {

    Optional<TrustScore> findBySessionId(UUID sessionId);

    List<TrustScore> findByCandidateIdAndSessionIdIn(Long candidateId, Collection<UUID> sessionIds);
}