package com.aihiring.applicationservice.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "applications", indexes = {
        @Index(name = "idx_job_candidate", columnList = "job_id,candidate_id", unique = true),
        @Index(name = "idx_job_id", columnList = "job_id"),
        @Index(name = "idx_candidate_id", columnList = "candidate_id")
})
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", nullable = false)
    private Long jobId;

    @Column(name = "candidate_id", nullable = false)
    private String candidateId;

    @Column(name = "candidate_email")
    private String candidateEmail;

    // Resume Information
    @Column(name = "resume_path")
    private String resumePath;

    @Enumerated(EnumType.STRING)
    @Column(name = "resume_status", nullable = false)
    private ResumeStatus resumeStatus = ResumeStatus.PENDING;

    @Column(name = "resume_score")
    private Float resumeScore;

    // AI Evaluation Details
    @Column(name = "ai_evaluation_details", columnDefinition = "TEXT")
    private String aiEvaluationDetails;

    // Application Progress
    @Enumerated(EnumType.STRING)
    @Column(name = "current_round", nullable = false)
    private Round currentRound = Round.RESUME;

    @Enumerated(EnumType.STRING)
    @Column(name = "overall_status", nullable = false)
    private ApplicationStatus overallStatus = ApplicationStatus.APPLIED;

    // Round Status
    @Enumerated(EnumType.STRING)
    @Column(name = "aptitude_status")
    private RoundStatus aptitudeStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "technical_status")
    private RoundStatus technicalStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "interview_status")
    private RoundStatus interviewStatus;

    // Round Scores
    @Column(name = "aptitude_score")
    private Float aptitudeScore;

    @Column(name = "technical_score")
    private Float technicalScore;

    @Column(name = "interview_score")
    private Float interviewScore;

    // Metadata
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Long getJobId() { return jobId; }
    public void setJobId(Long jobId) { this.jobId = jobId; }
    
    public String getCandidateId() { return candidateId; }
    public void setCandidateId(String candidateId) { this.candidateId = candidateId; }
    
    public String getCandidateEmail() { return candidateEmail; }
    public void setCandidateEmail(String candidateEmail) { this.candidateEmail = candidateEmail; }
    
    public String getResumePath() { return resumePath; }
    public void setResumePath(String resumePath) { this.resumePath = resumePath; }
    
    public ResumeStatus getResumeStatus() { return resumeStatus; }
    public void setResumeStatus(ResumeStatus resumeStatus) { this.resumeStatus = resumeStatus; }
    
    public Float getResumeScore() { return resumeScore; }
    public void setResumeScore(Float resumeScore) { this.resumeScore = resumeScore; }
    
    public String getAIEvaluationDetails() { return aiEvaluationDetails; }
    public void setAIEvaluationDetails(String aiEvaluationDetails) { this.aiEvaluationDetails = aiEvaluationDetails; }
    
    public Round getCurrentRound() { return currentRound; }
    public void setCurrentRound(Round currentRound) { this.currentRound = currentRound; }
    
    public ApplicationStatus getOverallStatus() { return overallStatus; }
    public void setOverallStatus(ApplicationStatus overallStatus) { this.overallStatus = overallStatus; }
    
    public RoundStatus getAptitudeStatus() { return aptitudeStatus; }
    public void setAptitudeStatus(RoundStatus aptitudeStatus) { this.aptitudeStatus = aptitudeStatus; }
    
    public RoundStatus getTechnicalStatus() { return technicalStatus; }
    public void setTechnicalStatus(RoundStatus technicalStatus) { this.technicalStatus = technicalStatus; }
    
    public RoundStatus getInterviewStatus() { return interviewStatus; }
    public void setInterviewStatus(RoundStatus interviewStatus) { this.interviewStatus = interviewStatus; }
    
    public Float getAptitudeScore() { return aptitudeScore; }
    public void setAptitudeScore(Float aptitudeScore) { this.aptitudeScore = aptitudeScore; }
    
    public Float getTechnicalScore() { return technicalScore; }
    public void setTechnicalScore(Float technicalScore) { this.technicalScore = technicalScore; }
    
    public Float getInterviewScore() { return interviewScore; }
    public void setInterviewScore(Float interviewScore) { this.interviewScore = interviewScore; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public enum ResumeStatus {
        PENDING,          // Resume uploaded, waiting for checking
        SHORTLISTED,      // Resume passed
        REJECTED          // Resume not suitable
    }

    public enum Round {
        RESUME,           // Resume submission stage
        APTITUDE,         // Aptitude test (if enabled)
        TECHNICAL,        // DSA/SQL test (if enabled)
        INTERVIEW,        // Interview round (if enabled)
        COMPLETED         // All rounds completed
    }

    public enum RoundStatus {
        NOT_STARTED,
        IN_PROGRESS,
        COMPLETED,
        PASSED,
        FAILED
    }

    public enum ApplicationStatus {
        APPLIED,
        RESUME_REVIEWING,
        RESUME_REJECTED,
        IN_ASSESSMENT,
        COMPLETED,
        SELECTED,
        REJECTED
    }
}
