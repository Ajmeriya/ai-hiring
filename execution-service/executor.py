"""Sandboxed code execution helpers."""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Iterable

from models import ExecutionRequest, ExecutionResponse, ExecutionTestResult


def _normalize_output(value: str) -> str:
    return "\n".join(line.rstrip() for line in value.strip().splitlines()).strip()


def _write_file(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def _docker_available() -> bool:
    return shutil.which("docker") is not None


def _run_docker(command: str, workdir: Path, timeout_seconds: int) -> subprocess.CompletedProcess[str]:
    docker_command = [
        "docker",
        "run",
        "--rm",
        "--mount",
        f"type=bind,source={str(workdir)},target=/app",
        "--memory=256m",
        "--cpus=1",
        "--network=none",
        "code-runner",
        "bash",
        "-lc",
        command,
    ]
    return subprocess.run(docker_command, text=True, capture_output=True, timeout=timeout_seconds)


def _compile_and_run(language: str, code: str, input_data: str, timeout_seconds: int, workdir: Path) -> subprocess.CompletedProcess[str]:
    language = language.lower()
    input_path = workdir / "input.txt"
    _write_file(input_path, input_data)

    if not _docker_available():
        return subprocess.CompletedProcess(args=[language], returncode=1, stdout="", stderr="Docker is not available on this machine")

    if language == "python":
        code_path = workdir / "main.py"
        _write_file(code_path, code)
        return _run_docker("python3 /app/main.py < /app/input.txt", workdir, timeout_seconds)

    if language == "cpp":
        source_path = workdir / "main.cpp"
        _write_file(source_path, code)
        return _run_docker("g++ main.cpp -std=c++17 -O2 -o main && ./main < /app/input.txt", workdir, timeout_seconds)

    if language == "java":
        source_path = workdir / "Main.java"
        _write_file(source_path, code)
        return _run_docker("javac Main.java && java Main < /app/input.txt", workdir, timeout_seconds)

    if language == "sql":
        import sqlite3

        cursor_db = sqlite3.connect(":memory:")
        try:
            payload = json.loads(input_data)
            setup_sql = payload.get("setup_sql", [])
            if isinstance(setup_sql, str):
                setup_sql = [setup_sql]
            for statement in setup_sql:
                statement = statement.strip()
                if statement:
                    cursor_db.executescript(statement)
            result = cursor_db.execute(code)
            rows = result.fetchall()
            output_lines = []
            for row in rows:
                output_lines.append("|".join(str(value) if value is not None else "NULL" for value in row))
            stdout = "\n".join(output_lines)
            return subprocess.CompletedProcess(args=["sqlite"], returncode=0, stdout=stdout, stderr="")
        except Exception as exc:
            return subprocess.CompletedProcess(args=["sqlite"], returncode=1, stdout="", stderr=str(exc))
        finally:
            cursor_db.close()

    return subprocess.CompletedProcess(args=[language], returncode=1, stdout="", stderr=f"Unsupported language: {language}")


def execute_request(request: ExecutionRequest, include_hidden: bool = False) -> ExecutionResponse:
    timeout_seconds = max(1, int(request.timeout_seconds or 2))
    results: list[ExecutionTestResult] = []
    passed = 0
    stderr_message = None
    stdout_message = None
    started = time.perf_counter()

    with tempfile.TemporaryDirectory(prefix="ai-hiring-exec-") as temp_dir:
        workdir = Path(temp_dir)
        for test_case in request.test_cases:
            if not include_hidden and getattr(test_case, "hidden", False):
                continue

            try:
                result = _compile_and_run(request.language, request.code, test_case.input_data, timeout_seconds, workdir)
            except subprocess.TimeoutExpired:
                stderr_message = "Time Limit Exceeded"
                results.append(
                    ExecutionTestResult(
                        inputData=test_case.input_data,
                        expectedOutput=test_case.expected_output,
                        actualOutput="",
                        passed=False,
                        hidden=test_case.hidden,
                        stderr="Time Limit Exceeded",
                    )
                )
                continue

            actual_output = (result.stdout or "").strip()
            expected_output = test_case.expected_output.strip()
            normalized_actual = _normalize_output(actual_output)
            normalized_expected = _normalize_output(expected_output)
            case_passed = result.returncode == 0 and normalized_actual == normalized_expected
            if case_passed:
                passed += 1
            else:
                stderr_message = result.stderr or stderr_message
                stdout_message = result.stdout or stdout_message

            results.append(
                ExecutionTestResult(
                    inputData=test_case.input_data,
                    expectedOutput=test_case.expected_output,
                    actualOutput=actual_output,
                    passed=case_passed,
                    hidden=test_case.hidden,
                    stderr=result.stderr or None,
                )
            )

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    total = len(results)
    verdict = "Accepted" if total and passed == total else ("Compilation Error" if results == [] and stderr_message else "Wrong Answer")
    if stderr_message and "Time Limit Exceeded" in stderr_message:
        verdict = "Time Limit Exceeded"
    elif stderr_message and total == 0:
        verdict = "Compilation Error"

    if verdict == "Accepted":
        stderr_message = None

    return ExecutionResponse(
        passed=passed,
        total=total,
        verdict=verdict,
        stderr=stderr_message,
        stdout=stdout_message,
        executionTimeMs=elapsed_ms,
        results=results,
    )
