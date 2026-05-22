package com.aihiring.applicationservice.repository;

import com.aihiring.applicationservice.model.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {
    Optional<Application> findByJobIdAndCandidateId(Long jobId, String candidateId);
    Optional<Application> findByJobIdAndCandidateEmail(Long jobId, String candidateEmail);
    List<Application> findByJobId(Long jobId);
    List<Application> findByCandidateId(String candidateId);
    List<Application> findByCandidateEmail(String candidateEmail);
    List<Application> findByOverallStatus(Application.ApplicationStatus status);
    Long countByJobId(Long jobId);
}
