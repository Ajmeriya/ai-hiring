package com.aihiring.anticheat.repository;

import com.aihiring.anticheat.entity.ProctoringSession;
import com.aihiring.anticheat.enums.SessionStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProctoringSessionRepository extends JpaRepository<ProctoringSession, UUID> {

    List<ProctoringSession> findByCandidateIdAndStatus(Long candidateId, SessionStatus status);
}