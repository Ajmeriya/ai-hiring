package com.aihiring.applicationservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

/**
 * DTO for AI Service evaluation response
 * Maps the Python FastAPI response from /evaluate endpoint
 */
public record AIEvaluationResponse(
    @JsonProperty("final_score")
    Double finalScore,

    @JsonProperty("matched_skills")
    List<String> matchedSkills,

    @JsonProperty("missing_skills")
    List<String> missingSkills,

    @JsonProperty("experience_match")
    String experienceMatch,

    @JsonProperty("project_insight")
    String projectInsight,

    @JsonProperty("decision")
    String decision,

    @JsonProperty("score_breakdown")
    Map<String, Double> scoreBreakdown,

    @JsonProperty("gemini_used")
    Boolean geminiUsed
) {}
