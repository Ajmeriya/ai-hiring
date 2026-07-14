"""Pydantic models for DSA and SQL questions."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class TestCaseItem(BaseModel):
    id: int
    inputData: str = Field(alias="inputData")
    expectedOutput: str = Field(alias="expectedOutput")
    hidden: bool = False

    class Config:
        populate_by_name = True


class CodingQuestionItem(BaseModel):
    id: int
    title: str
    statement: str
    topic: str
    difficulty: str
    tags: List[str] = Field(default_factory=list)
    constraintsText: str = Field(default="", alias="constraintsText")
    inputFormat: str = Field(default="", alias="inputFormat")
    outputFormat: str = Field(default="", alias="outputFormat")
    starterCodeCpp: str = Field(default="", alias="starterCodeCpp")
    starterCodeJava: str = Field(default="", alias="starterCodeJava")
    starterCodePython: str = Field(default="", alias="starterCodePython")
    starterCodeSql: str = Field(default="", alias="starterCodeSql")
    solutionCode: str = Field(default="", alias="solutionCode")
    timeLimitMs: int = Field(default=2000, alias="timeLimitMs")
    memoryLimitMb: int = Field(default=256, alias="memoryLimitMb")
    visibleTestCases: List[TestCaseItem] = Field(default_factory=list, alias="visibleTestCases")

    class Config:
        populate_by_name = True


class DSAQuestionAssignRequest(BaseModel):
    application_id: int = Field(alias="applicationId")
    job_id: int = Field(alias="jobId")
    dsa_count: int = Field(default=0, alias="dsaCount")
    dsa_topics: List[str] = Field(default_factory=list, alias="dsaTopics")
    dsa_difficulty: Optional[str] = Field(default=None, alias="dsaDifficulty")
    sql_count: int = Field(default=0, alias="sqlCount")
    sql_topics: List[str] = Field(default_factory=list, alias="sqlTopics")
    sql_difficulty: Optional[str] = Field(default=None, alias="sqlDifficulty")

    class Config:
        populate_by_name = True


class DSAQuestionAssignResponse(BaseModel):
    application_id: int = Field(alias="applicationId")
    job_id: int = Field(alias="jobId")
    dsa_count: int = Field(alias="dsaCount")
    sql_count: int = Field(alias="sqlCount")
    questions: List[CodingQuestionItem]

    class Config:
        populate_by_name = True


class TestCaseRecord(BaseModel):
    input_data: str = Field(alias="inputData")
    expected_output: str = Field(alias="expectedOutput")
    hidden: bool = False

    class Config:
        populate_by_name = True


class HealthResponse(BaseModel):
    status: str
    database_ready: bool = Field(alias="databaseReady")
