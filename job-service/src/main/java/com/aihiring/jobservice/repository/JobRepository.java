package com.aihiring.jobservice.repository;

import com.aihiring.jobservice.model.Job;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JobRepository extends JpaRepository<Job, Long> {

    @Override
    @EntityGraph(attributePaths = {"skills", "jobRounds", "aptitudeConfig", "technicalConfig", "interviewConfig"})
    Optional<Job> findById(Long id);

    @EntityGraph(attributePaths = {"skills", "jobRounds", "aptitudeConfig", "technicalConfig", "interviewConfig"})
    List<Job> findAllByOrderByIdDesc();
}