package com.aihiring.jobservice.dto;

public record JobSummaryResponse(
        Long id,
        String title,
        String company,
        String department,
        String salary,
        String description,
        Integer requiredExperienceYears,
        int skillCount,
        boolean aptitudeEnabled,
        boolean technicalEnabled,
        boolean interviewEnabled,
        String status
) {
}