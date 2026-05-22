"""Pydantic models for aptitude question generation and assignment."""

from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field


class AptitudeQuestionItem(BaseModel):
    id: int
    question: str
    options: List[str]
    correctAnswerIndex: int
    explanation: str = ""
    topic: str = "General Aptitude"
    difficulty: str = "medium"


class AptitudeQuestionRequest(BaseModel):
    application_id: int = Field(alias="applicationId")
    job_id: int = Field(alias="jobId")
    count: int = Field(gt=0)
    job_title: str = Field(default="Unknown", alias="jobTitle")
    job_description: str = Field(default="", alias="jobDescription")
    required_skills: List[str] = Field(default_factory=list, alias="requiredSkills")
    topics: List[str] = Field(default_factory=list)
    difficulty: str = "medium"
    aptitude_type: str = Field(default="mcq", alias="aptitudeType")
    aptitude_time: int = Field(default=30, alias="aptitudeTime")
    recruiter_topics_raw: str = Field(default="", alias="recruiterTopicsRaw")

    class Config:
        populate_by_name = True


class AptitudeQuestionResponse(BaseModel):
    application_id: int = Field(alias="applicationId")
    job_id: int = Field(alias="jobId")
    count: int
    pool_size: int = Field(alias="poolSize")
    bank_size: int = Field(alias="bankSize")
    generated_count: int = Field(alias="generatedCount")
    questions: List[AptitudeQuestionItem]

    class Config:
        populate_by_name = True


class HealthResponse(BaseModel):
    status: str
    gemini_available: bool = Field(alias="geminiAvailable")
    database_ready: bool = Field(alias="databaseReady")
