package com.aihiring.jobservice.controller;

import com.aihiring.jobservice.dto.CreateJobRequest;
import com.aihiring.jobservice.dto.JobResponse;
import com.aihiring.jobservice.dto.JobSummaryResponse;
import com.aihiring.jobservice.service.JobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.aihiring.jobservice.dto.JobUpdateRequest;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    @PostMapping
    public ResponseEntity<JobResponse> createJob(@Valid @RequestBody CreateJobRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobService.createJob(request));
    }

    @GetMapping
    public List<JobSummaryResponse> getJobs() {
        return jobService.getJobs();
    }

    @GetMapping("/{id}")
    public JobResponse getJobById(@PathVariable Long id) {
        return jobService.getJobById(id);
    }

    @PatchMapping("/{id}")
    public JobResponse patchJob(@PathVariable Long id, @RequestBody JobUpdateRequest request) {
        return jobService.updateJob(id, request);
    }
}