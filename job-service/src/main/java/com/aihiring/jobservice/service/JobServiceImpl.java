package com.aihiring.jobservice.service;

import com.aihiring.jobservice.dto.CreateJobRequest;
import com.aihiring.jobservice.dto.JobResponse;
import com.aihiring.jobservice.dto.JobSummaryResponse;
import com.aihiring.jobservice.dto.JobUpdateRequest;
import com.aihiring.jobservice.exception.ResourceNotFoundException;
import com.aihiring.jobservice.model.AptitudeConfig;
import com.aihiring.jobservice.model.InterviewConfig;
import com.aihiring.jobservice.model.Job;
import com.aihiring.jobservice.model.JobRounds;
import com.aihiring.jobservice.model.JobSkill;
import com.aihiring.jobservice.model.TechnicalConfig;
import com.aihiring.jobservice.repository.JobRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class JobServiceImpl implements JobService {

    private static final String DEFAULT_STATUS = "active";

    private final JobRepository jobRepository;

    @Override
    @Transactional
    public JobResponse createJob(CreateJobRequest request) {
        Job job = new Job();
        job.setTitle(request.title());
        job.setCompany(request.company());
        job.setDepartment(request.department());
        job.setSalary(request.salary());
        job.setDescription(request.description());
        job.setRequiredExperienceYears(request.requiredExperienceYears());

        if (request.skills() != null) {
            request.skills().stream()
                    .map(String::trim)
                    .filter(skill -> !skill.isBlank())
                    .map(skill -> new JobSkill(job, skill))
                    .forEach(job.getSkills()::add);
        }

        if (request.jobRounds() != null) {
            JobRounds jobRounds = new JobRounds();
            jobRounds.setJob(job);
            jobRounds.setAptitudeEnabled(request.jobRounds().aptitudeEnabled());
            jobRounds.setTechnicalEnabled(request.jobRounds().technicalEnabled());
            jobRounds.setInterviewEnabled(request.jobRounds().interviewEnabled());
            job.setJobRounds(jobRounds);
        }

        if (request.aptitudeConfig() != null) {
            AptitudeConfig aptitudeConfig = new AptitudeConfig();
            aptitudeConfig.setJob(job);
            aptitudeConfig.setNumQuestions(request.aptitudeConfig().numQuestions());
            aptitudeConfig.setTopics(normalizeTopics(request.aptitudeConfig().topics()));
            aptitudeConfig.setType(request.aptitudeConfig().type());
            aptitudeConfig.setTime(request.aptitudeConfig().time());
            job.setAptitudeConfig(aptitudeConfig);
        }

        if (request.technicalConfig() != null) {
            TechnicalConfig technicalConfig = new TechnicalConfig();
            technicalConfig.setJob(job);
            technicalConfig.setDsaQuestions(request.technicalConfig().dsaQuestions());
            technicalConfig.setDsaTopics(normalizeTopics(request.technicalConfig().dsaTopics()));
            technicalConfig.setDsaDifficulty(normalizeChoice(request.technicalConfig().dsaDifficulty()));
            technicalConfig.setSqlQuestions(request.technicalConfig().sqlQuestions());
            technicalConfig.setSqlTopics(normalizeTopics(request.technicalConfig().sqlTopics()));
            technicalConfig.setSqlDifficulty(normalizeChoice(request.technicalConfig().sqlDifficulty()));
            technicalConfig.setTime(request.technicalConfig().time());
            job.setTechnicalConfig(technicalConfig);
        }

        if (request.interviewConfig() != null) {
            InterviewConfig interviewConfig = new InterviewConfig();
            interviewConfig.setJob(job);
            interviewConfig.setDuration(request.interviewConfig().duration());
            interviewConfig.setTopics(normalizeTopics(request.interviewConfig().topics()));
            job.setInterviewConfig(interviewConfig);
        }

        return toJobResponse(jobRepository.save(job));
    }

    @Override
    @Transactional(readOnly = true)
    public List<JobSummaryResponse> getJobs() {
        return jobRepository.findAllByOrderByIdDesc().stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public JobResponse getJobById(Long id) {
        return jobRepository.findById(id)
                .map(this::toJobResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + id));
    }

    @Override
    @Transactional
    public JobResponse updateJob(Long id, JobUpdateRequest request) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + id));

        if (request.status() != null) {
            job.setStatus(request.status());
        }

        if (request.jobRounds() != null) {
            JobRounds jobRounds = job.getJobRounds();
            if (jobRounds == null) {
                jobRounds = new JobRounds();
                jobRounds.setJob(job);
                job.setJobRounds(jobRounds);
            }
            jobRounds.setAptitudeEnabled(request.jobRounds().aptitudeEnabled());
            jobRounds.setTechnicalEnabled(request.jobRounds().technicalEnabled());
            jobRounds.setInterviewEnabled(request.jobRounds().interviewEnabled());
        }

        if (request.aptitudeConfig() != null) {
            AptitudeConfig aptitudeConfig = job.getAptitudeConfig();
            if (aptitudeConfig == null) {
                aptitudeConfig = new AptitudeConfig();
                aptitudeConfig.setJob(job);
                job.setAptitudeConfig(aptitudeConfig);
            }
            aptitudeConfig.setNumQuestions(request.aptitudeConfig().numQuestions());
            aptitudeConfig.setTopics(normalizeTopics(request.aptitudeConfig().topics()));
            aptitudeConfig.setType(request.aptitudeConfig().type());
            aptitudeConfig.setTime(request.aptitudeConfig().time());
        }

        if (request.technicalConfig() != null) {
            TechnicalConfig technicalConfig = job.getTechnicalConfig();
            if (technicalConfig == null) {
                technicalConfig = new TechnicalConfig();
                technicalConfig.setJob(job);
                job.setTechnicalConfig(technicalConfig);
            }
            technicalConfig.setDsaQuestions(request.technicalConfig().dsaQuestions());
            technicalConfig.setDsaTopics(normalizeTopics(request.technicalConfig().dsaTopics()));
            technicalConfig.setDsaDifficulty(normalizeChoice(request.technicalConfig().dsaDifficulty()));
            technicalConfig.setSqlQuestions(request.technicalConfig().sqlQuestions());
            technicalConfig.setSqlTopics(normalizeTopics(request.technicalConfig().sqlTopics()));
            technicalConfig.setSqlDifficulty(normalizeChoice(request.technicalConfig().sqlDifficulty()));
            technicalConfig.setTime(request.technicalConfig().time());
        }

        if (request.interviewConfig() != null) {
            InterviewConfig interviewConfig = job.getInterviewConfig();
            if (interviewConfig == null) {
                interviewConfig = new InterviewConfig();
                interviewConfig.setJob(job);
                job.setInterviewConfig(interviewConfig);
            }
            interviewConfig.setDuration(request.interviewConfig().duration());
            interviewConfig.setTopics(normalizeTopics(request.interviewConfig().topics()));
        }

        return toJobResponse(jobRepository.save(job));
    }

    private String normalizeTopics(String topics) {
        return topics == null ? null : topics.trim();
    }

    private String normalizeChoice(String value) {
        return value == null ? null : value.trim().toLowerCase();
    }

    private JobResponse toJobResponse(Job job) {
        return new JobResponse(
                job.getId(),
                job.getTitle(),
                job.getCompany(),
                job.getDepartment(),
                job.getSalary(),
                job.getDescription(),
                job.getRequiredExperienceYears(),
                job.getStatus() == null ? DEFAULT_STATUS : job.getStatus(),
                job.getSkills().stream().map(JobSkill::getSkill).toList(),
                job.getJobRounds() == null ? null : new JobResponse.JobRoundsResponse(
                        job.getJobRounds().isAptitudeEnabled(),
                        job.getJobRounds().isTechnicalEnabled(),
                        job.getJobRounds().isInterviewEnabled()
                ),
                job.getAptitudeConfig() == null ? null : new JobResponse.AptitudeConfigResponse(
                        job.getAptitudeConfig().getNumQuestions(),
                        job.getAptitudeConfig().getTopics(),
                        job.getAptitudeConfig().getType(),
                        job.getAptitudeConfig().getTime()
                ),
                job.getTechnicalConfig() == null ? null : new JobResponse.TechnicalConfigResponse(
                        job.getTechnicalConfig().getDsaQuestions(),
                        job.getTechnicalConfig().getDsaTopics(),
                        job.getTechnicalConfig().getDsaDifficulty(),
                        job.getTechnicalConfig().getSqlQuestions(),
                        job.getTechnicalConfig().getSqlTopics(),
                        job.getTechnicalConfig().getSqlDifficulty(),
                        job.getTechnicalConfig().getTime()
                ),
                job.getInterviewConfig() == null ? null : new JobResponse.InterviewConfigResponse(
                        job.getInterviewConfig().getDuration(),
                        job.getInterviewConfig().getTopics()
                )
        );
    }

    private JobSummaryResponse toSummaryResponse(Job job) {
        return new JobSummaryResponse(
                job.getId(),
                job.getTitle(),
                job.getCompany(),
                job.getDepartment(),
                job.getSalary(),
                job.getDescription(),
                job.getRequiredExperienceYears(),
                job.getSkills() == null ? 0 : job.getSkills().size(),
                job.getJobRounds() != null && job.getJobRounds().isAptitudeEnabled(),
                job.getJobRounds() != null && job.getJobRounds().isTechnicalEnabled(),
                job.getJobRounds() != null && job.getJobRounds().isInterviewEnabled(),
                job.getStatus() == null ? DEFAULT_STATUS : job.getStatus()
        );
    }
}
