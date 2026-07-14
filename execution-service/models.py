"""Pydantic models for code execution requests and results."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class RunTestCase(BaseModel):
    input_data: str = Field(alias="inputData")
    expected_output: str = Field(alias="expectedOutput")
    hidden: bool = False

    class Config:
        populate_by_name = True


class ExecutionRequest(BaseModel):
    language: str
    code: str
    question_id: int | None = Field(default=None, alias="questionId")
    test_cases: List[RunTestCase] = Field(default_factory=list, alias="testCases")
    timeout_seconds: int = Field(default=2, alias="timeoutSeconds")

    class Config:
        populate_by_name = True


class ExecutionTestResult(BaseModel):
    input_data: str = Field(alias="inputData")
    expected_output: str = Field(alias="expectedOutput")
    actual_output: str = Field(alias="actualOutput")
    passed: bool
    hidden: bool = False
    stderr: Optional[str] = None

    class Config:
        populate_by_name = True


class ExecutionResponse(BaseModel):
    passed: int
    total: int
    verdict: str
    stderr: Optional[str] = None
    stdout: Optional[str] = None
    execution_time_ms: int = Field(alias="executionTimeMs")
    results: List[ExecutionTestResult] = Field(default_factory=list)

    class Config:
        populate_by_name = True
