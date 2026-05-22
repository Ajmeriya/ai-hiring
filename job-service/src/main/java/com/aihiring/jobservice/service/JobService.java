package com.aihiring.jobservice.service;

import com.aihiring.jobservice.dto.CreateJobRequest;
import com.aihiring.jobservice.dto.JobResponse;
import com.aihiring.jobservice.dto.JobSummaryResponse;
import com.aihiring.jobservice.dto.JobUpdateRequest;

import java.util.List;

public interface JobService {

    JobResponse createJob(CreateJobRequest request);

    List<JobSummaryResponse> getJobs();

    JobResponse getJobById(Long id);

    JobResponse updateJob(Long id, JobUpdateRequest request);
}