"""Business logic for DSA and SQL question banking."""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

from db import execute, execute_many, fetch_all, fetch_one
from models import CodingQuestionItem, DSAQuestionAssignRequest, DSAQuestionAssignResponse, TestCaseItem
from catalog.arrays import QUESTIONS as ARRAY_QUESTIONS
from catalog.binary_search import QUESTIONS as BINARY_SEARCH_QUESTIONS
from catalog.sql import QUESTIONS as SQL_QUESTIONS
from catalog.stack import QUESTIONS as STACK_QUESTIONS
from catalog.strings import QUESTIONS as STRING_QUESTIONS

logger = logging.getLogger(__name__)

CPP_STARTER = """#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    return 0;
}
"""

JAVA_STARTER = """public class Main {
    public static void main(String[] args) throws Exception {

    }
}
"""

PYTHON_STARTER = """import sys


def main():
    pass


if __name__ == '__main__':
    main()
"""

SQL_STARTER = "-- Write your SQL query here\n"

TOPIC_ALIASES: dict[str, str] = {
    # DSA topics
    "array": "Arrays",
    "arrays": "Arrays",
    "string": "Strings",
    "strings": "Strings",
    "binary search": "Binary Search",
    "binary_search": "Binary Search",
    "stack": "Stack",
    # SQL — main topic
    "sql": "SQL",
    # SQL sub-topics / groups → all map to "SQL"
    "joins": "SQL",
    "joins group": "SQL",
    "join": "SQL",
    "left join": "SQL",
    "inner join": "SQL",
    "right join": "SQL",
    "self join": "SQL",
    "aggregation": "SQL",
    "aggregations": "SQL",
    "group by": "SQL",
    "having": "SQL",
    "subquery": "SQL",
    "subqueries": "SQL",
    "window function": "SQL",
    "window functions": "SQL",
    "cte": "SQL",
    "common table expression": "SQL",
    "where": "SQL",
    "filtering": "SQL",
    "order by": "SQL",
    "sorting": "SQL",
    "distinct": "SQL",
    "limit": "SQL",
    "union": "SQL",
    "insert": "SQL",
    "update": "SQL",
    "delete": "SQL",
}


QUESTION_CATALOG: list[dict[str, Any]] = [
    *ARRAY_QUESTIONS,
    *STRING_QUESTIONS,
    *BINARY_SEARCH_QUESTIONS,
    *STACK_QUESTIONS,
    *SQL_QUESTIONS,
]

ADDITIONAL_HIDDEN_TEST_CASES_PER_QUESTION = 10


def _append_additional_hidden_test_cases(
    test_cases: list[dict[str, Any]],
    additional_hidden: int = ADDITIONAL_HIDDEN_TEST_CASES_PER_QUESTION,
) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for case in test_cases:
        if "input_data" not in case or "expected_output" not in case:
            continue
        normalized.append(
            {
                "input_data": case["input_data"],
                "expected_output": case["expected_output"],
                "hidden": bool(case.get("hidden", False)),
            }
        )

    hidden_sources = [case for case in normalized if case["hidden"]]
    fallback_sources = hidden_sources or normalized
    if not fallback_sources:
        return normalized

    source_index = 0
    for _ in range(additional_hidden):
        source = fallback_sources[source_index % len(fallback_sources)]
        normalized.append(
            {
                "input_data": source["input_data"],
                "expected_output": source["expected_output"],
                "hidden": True,
            }
        )
        source_index += 1

    return normalized


def _question_hash(item: dict[str, Any]) -> str:
    payload = json.dumps(
        {
            "title": item["title"],
            "topic": item["topic"],
            "difficulty": item["difficulty"],
            "statement": item["statement"],
        },
        sort_keys=True,
        ensure_ascii=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _split_tags(raw_tags: str | None) -> list[str]:
    return [tag.strip() for tag in (raw_tags or "").split(",") if tag.strip()]


def _format_statement(row: dict[str, Any], visible_test_cases: list[TestCaseItem]) -> str:
    title = (row.get("title") or "Programming Challenge").strip()
    statement = (row.get("statement") or "").strip()
    tags = _split_tags(row.get("tags"))
    constraints_text = (row.get("constraints_text") or "").strip()
    input_format = (row.get("input_format") or "").strip()
    output_format = (row.get("output_format") or "").strip()

    sections: list[str] = [
        title,
        "Problem Statement",
        statement,
        "Task",
        "Read the input exactly as described, produce only the required output, and write an efficient solution that handles edge cases and large inputs.",
    ]

    if tags:
        sections.extend([
            "Focus Areas",
            ", ".join(tags),
        ])

    if constraints_text:
        sections.extend([
            "Constraints",
            constraints_text,
        ])

    if input_format:
        sections.extend([
            "Input Format",
            input_format,
        ])

    if output_format:
        sections.extend([
            "Output Format",
            output_format,
        ])

    if visible_test_cases:
        sample = visible_test_cases[0]
        sections.extend([
            "Sample Input",
            sample.inputData,
            "Sample Output",
            sample.expectedOutput,
        ])

    sections.extend([
        "Submission Notes",
        "Your code is first evaluated on visible examples while you code, then on hidden test cases after submission.",
    ])

    return "\n\n".join(section for section in sections if section).strip()


def _normalize_topic(value: str | None) -> str:
    return (value or "").strip()


def _canonical_topic(value: str | None) -> str:
    normalized = _normalize_topic(value).lower()
    return TOPIC_ALIASES.get(normalized, _normalize_topic(value))


def _normalize_difficulty(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    return normalized if normalized in {"easy", "medium", "hard"} else "medium"


def _normalize_topic_list(topics: list[str]) -> list[str]:
    seen: set[str] = set()
    normalized: list[str] = []
    for topic in topics:
        canonical = _canonical_topic(topic)
        if canonical and canonical not in seen:
            seen.add(canonical)
            normalized.append(canonical)
    return normalized


def _to_visible_test_items(question_id: int) -> list[TestCaseItem]:
    rows = fetch_all(
        """
        SELECT id, input_data, expected_output, hidden
        FROM test_cases
        WHERE question_id = %s AND hidden = FALSE
        ORDER BY id ASC
        """,
        (question_id,),
    )
    return [
        TestCaseItem(id=row["id"], inputData=row["input_data"], expectedOutput=row["expected_output"], hidden=bool(row["hidden"]))
        for row in rows
    ]


def _to_question_item(row: dict[str, Any], include_visible_tests: bool = True) -> CodingQuestionItem:
    visible_test_cases = _to_visible_test_items(row["id"]) if include_visible_tests else []
    return CodingQuestionItem(
        id=row["id"],
        title=row["title"],
        statement=_format_statement(row, visible_test_cases),
        topic=row["topic"],
        difficulty=row["difficulty"],
        tags=_split_tags(row.get("tags")),
        constraintsText=row.get("constraints_text") or "",
        inputFormat=row.get("input_format") or "",
        outputFormat=row.get("output_format") or "",
        starterCodeCpp=row.get("starter_code_cpp") or CPP_STARTER,
        starterCodeJava=row.get("starter_code_java") or JAVA_STARTER,
        starterCodePython=row.get("starter_code_python") or PYTHON_STARTER,
        starterCodeSql=row.get("starter_code_sql") or SQL_STARTER,
        solutionCode=row.get("solution_code") or "",
        timeLimitMs=row.get("time_limit_ms") or 2000,
        memoryLimitMb=row.get("memory_limit_mb") or 256,
        visibleTestCases=visible_test_cases,
    )


def _fetch_question_for_topic(topic: str, difficulty: str, exclude_ids: set[int] | None = None) -> dict[str, Any] | None:
    canonical_topic = _canonical_topic(topic)
    if not canonical_topic:
        return None

    exclude_clause = ""
    params: list[Any] = [canonical_topic, difficulty]
    if exclude_ids:
        placeholders = ", ".join(["%s"] * len(exclude_ids))
        exclude_clause = f" AND id NOT IN ({placeholders})"
        params.extend(sorted(exclude_ids))

    query = f"""
        SELECT *
        FROM coding_questions
        WHERE LOWER(topic) = LOWER(%s)
          AND difficulty = %s
          {exclude_clause}
        ORDER BY RAND()
        LIMIT 1
    """
    return fetch_one(query, tuple(params))


def _fetch_random_questions(difficulty: str, limit: int, exclude_ids: set[int] | None = None) -> list[dict[str, Any]]:
    if limit <= 0:
        return []

    exclude_clause = ""
    params: list[Any] = [difficulty, limit]
    if exclude_ids:
        placeholders = ", ".join(["%s"] * len(exclude_ids))
        exclude_clause = f" AND id NOT IN ({placeholders})"
        params.extend(sorted(exclude_ids))

    query = f"""
        SELECT *
        FROM coding_questions
        WHERE difficulty = %s
          {exclude_clause}
        ORDER BY RAND()
        LIMIT %s
    """
    return fetch_all(query, tuple(params))


def _fetch_questions_from_topics(
    topics: list[str],
    difficulty: str | None,
    limit: int,
    exclude_ids: set[int] | None = None,
) -> list[dict[str, Any]]:
    if limit <= 0:
        return []

    canonical_topics = _normalize_topic_list(topics)
    if not canonical_topics:
        return []

    topic_placeholders = ", ".join(["%s"] * len(canonical_topics))
    params: list[Any] = [*canonical_topics]
    filters = [f"LOWER(topic) IN ({topic_placeholders})"]

    if difficulty:
        filters.append("difficulty = %s")
        params.append(difficulty)

    if exclude_ids:
        exclude_placeholders = ", ".join(["%s"] * len(exclude_ids))
        filters.append(f"id NOT IN ({exclude_placeholders})")
        params.extend(sorted(exclude_ids))

    params.append(limit)

    query = f"""
        SELECT *
        FROM coding_questions
        WHERE {' AND '.join(filters)}
        ORDER BY RAND()
        LIMIT %s
    """
    return fetch_all(query, tuple(params))


def _select_questions_for_topics(topics: list[str], difficulty: str, limit: int) -> list[dict[str, Any]]:
    canonical_topics = _normalize_topic_list(topics)
    if not canonical_topics or limit <= 0:
        return []

    selected: list[dict[str, Any]] = []
    selected_ids: set[int] = set()

    for level in (difficulty, "easy", "medium", "hard"):
        if len(selected) >= limit:
            break
        rows = _fetch_questions_from_topics(
            canonical_topics,
            level,
            limit - len(selected),
            exclude_ids=selected_ids,
        )
        for row in rows:
            if row["id"] in selected_ids:
                continue
            selected.append(row)
            selected_ids.add(row["id"])
            if len(selected) >= limit:
                break

    return selected


def _ensure_exact_count(rows: list[dict[str, Any]], expected_count: int, label: str, topics: list[str], difficulty: str) -> None:
    if len(rows) != expected_count:
        topic_text = ", ".join(topics) if topics else "<unspecified>"
        raise RuntimeError(
            f"Unable to assign exactly {expected_count} {label} questions for topics [{topic_text}] at difficulty '{difficulty}'."
        )


def _assignment_signature(request: DSAQuestionAssignRequest) -> str:
    payload = json.dumps(
        {
            "applicationId": request.application_id,
            "jobId": request.job_id,
            "dsaCount": request.dsa_count,
            "dsaTopics": _normalize_topic_list(request.dsa_topics),
            "dsaDifficulty": _normalize_difficulty(request.dsa_difficulty),
            "sqlCount": request.sql_count,
            "sqlTopics": _normalize_topic_list(request.sql_topics),
            "sqlDifficulty": _normalize_difficulty(request.sql_difficulty),
        },
        sort_keys=True,
        ensure_ascii=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _load_assignment(request: DSAQuestionAssignRequest) -> list[int] | None:
    row = fetch_one(
        """
        SELECT question_ids_json, assignment_signature, request_json
        FROM question_assignments
        WHERE application_id = %s AND job_id = %s
        """,
        (request.application_id, request.job_id),
    )
    if not row:
        return None

    if row.get("assignment_signature") != _assignment_signature(request):
        return None

    try:
        question_ids = json.loads(row["question_ids_json"])
    except Exception:
        return None

    return [int(question_id) for question_id in question_ids if str(question_id).isdigit() or isinstance(question_id, int)]


def _save_assignment(request: DSAQuestionAssignRequest, question_ids: list[int]) -> None:
    signature = _assignment_signature(request)
    payload = json.dumps(
        {
            "applicationId": request.application_id,
            "jobId": request.job_id,
            "dsaCount": request.dsa_count,
            "dsaTopics": _normalize_topic_list(request.dsa_topics),
            "dsaDifficulty": _normalize_difficulty(request.dsa_difficulty),
            "sqlCount": request.sql_count,
            "sqlTopics": _normalize_topic_list(request.sql_topics),
            "sqlDifficulty": _normalize_difficulty(request.sql_difficulty),
        },
        sort_keys=True,
        ensure_ascii=True,
    )
    execute(
        """
        INSERT INTO question_assignments (application_id, job_id, assignment_signature, request_json, question_ids_json)
        VALUES (%s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            assignment_signature = VALUES(assignment_signature),
            request_json = VALUES(request_json),
            question_ids_json = VALUES(question_ids_json)
        """,
        (
            request.application_id,
            request.job_id,
            signature,
            payload,
            json.dumps(question_ids),
        ),
    )


def _upsert_question(item: dict[str, Any]) -> int:
    question_hash = _question_hash(item)
    existing = fetch_one("SELECT id FROM coding_questions WHERE question_hash = %s", (question_hash,))
    values = (
        question_hash,
        item["title"],
        item["statement"],
        item["topic"],
        item["difficulty"],
        ", ".join(item.get("tags", [])),
        item.get("constraints_text", ""),
        item.get("input_format", ""),
        item.get("output_format", ""),
        item.get("starter_code_cpp", CPP_STARTER),
        item.get("starter_code_java", JAVA_STARTER),
        item.get("starter_code_python", PYTHON_STARTER),
        item.get("starter_code_sql", SQL_STARTER),
        item.get("solution_code", ""),
        item.get("time_limit_ms", 2000),
        item.get("memory_limit_mb", 256),
    )

    if existing:
        execute(
            """
            UPDATE coding_questions
            SET title = %s,
                statement = %s,
                topic = %s,
                difficulty = %s,
                tags = %s,
                constraints_text = %s,
                input_format = %s,
                output_format = %s,
                starter_code_cpp = %s,
                starter_code_java = %s,
                starter_code_python = %s,
                starter_code_sql = %s,
                solution_code = %s,
                time_limit_ms = %s,
                memory_limit_mb = %s
            WHERE question_hash = %s
            """,
            (
                item["title"],
                item["statement"],
                item["topic"],
                item["difficulty"],
                ", ".join(item.get("tags", [])),
                item.get("constraints_text", ""),
                item.get("input_format", ""),
                item.get("output_format", ""),
                item.get("starter_code_cpp", CPP_STARTER),
                item.get("starter_code_java", JAVA_STARTER),
                item.get("starter_code_python", PYTHON_STARTER),
                item.get("starter_code_sql", SQL_STARTER),
                item.get("solution_code", ""),
                item.get("time_limit_ms", 2000),
                item.get("memory_limit_mb", 256),
                question_hash,
            ),
        )
        question_id = existing["id"]
        execute("DELETE FROM test_cases WHERE question_id = %s", (question_id,))
    else:
        execute(
            """
            INSERT INTO coding_questions (
                question_hash, title, statement, topic, difficulty, tags,
                constraints_text, input_format, output_format,
                starter_code_cpp, starter_code_java, starter_code_python, starter_code_sql,
                solution_code, time_limit_ms, memory_limit_mb
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            values,
        )
        inserted = fetch_one("SELECT id FROM coding_questions WHERE question_hash = %s", (question_hash,))
        if not inserted:
            raise RuntimeError(f"Failed to insert question {item['title']}")
        question_id = inserted["id"]

    test_case_rows = []
    normalized_test_cases = _append_additional_hidden_test_cases(item.get("test_cases", []))
    for test_case in normalized_test_cases:
        test_case_rows.append(
            (
                question_id,
                test_case["input_data"],
                test_case["expected_output"],
                bool(test_case.get("hidden", False)),
            )
        )

    if test_case_rows:
        execute_many(
            """
            INSERT INTO test_cases (question_id, input_data, expected_output, hidden)
            VALUES (%s, %s, %s, %s)
            """,
            test_case_rows,
        )

    return question_id


def ensure_seed_data() -> int:
    if not QUESTION_CATALOG:
        logger.warning("Question catalog is empty; no DSA questions were seeded")
        return 0

    seeded = 0
    for question in QUESTION_CATALOG:
        _upsert_question(question)
        seeded += 1
    logger.info("Seeded %s DSA/SQL questions", seeded)
    return seeded


class DSAQuestionService:
    def health(self) -> dict:
        return {
            "status": "ok",
            "databaseReady": True,
        }

    def assign_questions(self, request: DSAQuestionAssignRequest) -> DSAQuestionAssignResponse:
        requested_dsa_difficulty = _normalize_difficulty(request.dsa_difficulty)
        requested_sql_difficulty = _normalize_difficulty(request.sql_difficulty)
        questions: list[CodingQuestionItem] = []

        cached_question_ids = _load_assignment(request)
        if cached_question_ids:
            cached_rows = []
            for question_id in cached_question_ids:
                row = fetch_one("SELECT * FROM coding_questions WHERE id = %s", (question_id,))
                if row:
                    cached_rows.append(row)
            if cached_rows and len(cached_rows) == len(cached_question_ids):
                questions = [_to_question_item(row, include_visible_tests=True) for row in cached_rows]
                return DSAQuestionAssignResponse(
                    applicationId=request.application_id,
                    jobId=request.job_id,
                    dsaCount=request.dsa_count,
                    sqlCount=request.sql_count,
                    questions=questions,
                )

        if request.dsa_count > 0:
            dsa_topics = _normalize_topic_list(request.dsa_topics or ["Arrays", "Strings", "Binary Search", "Stack"])
            dsa_rows = _select_questions_for_topics(dsa_topics, requested_dsa_difficulty, request.dsa_count)
            _ensure_exact_count(dsa_rows, request.dsa_count, "DSA", dsa_topics, requested_dsa_difficulty)
            for row in dsa_rows:
                questions.append(_to_question_item(row, include_visible_tests=True))

        if request.sql_count > 0:
            sql_topics = _normalize_topic_list(request.sql_topics or ["SQL"])
            sql_rows = _select_questions_for_topics(sql_topics, requested_sql_difficulty, request.sql_count)
            _ensure_exact_count(sql_rows, request.sql_count, "SQL", sql_topics, requested_sql_difficulty)
            for row in sql_rows:
                questions.append(_to_question_item(row, include_visible_tests=True))

        if not questions:
            fallback_rows = _fetch_questions_from_topics(["Arrays", "Strings", "Binary Search", "Stack", "SQL"], "medium", max(request.dsa_count + request.sql_count, 10))
            questions = [_to_question_item(row, include_visible_tests=True) for row in fallback_rows]

        if len(questions) != request.dsa_count + request.sql_count:
            raise RuntimeError(
                f"Assignment split mismatch: expected {request.dsa_count} DSA and {request.sql_count} SQL questions, got {len(questions)} total."
            )

        _save_assignment(request, [question.id for question in questions])

        return DSAQuestionAssignResponse(
            applicationId=request.application_id,
            jobId=request.job_id,
            dsaCount=request.dsa_count,
            sqlCount=request.sql_count,
            questions=questions,
        )

    def get_question(self, question_id: int) -> CodingQuestionItem | None:
        row = fetch_one("SELECT * FROM coding_questions WHERE id = %s", (question_id,))
        return _to_question_item(row, include_visible_tests=True) if row else None

    def get_test_cases(self, question_id: int, include_hidden: bool = False) -> list[TestCaseItem]:
        if include_hidden:
            rows = fetch_all(
                """
                SELECT id, input_data, expected_output, hidden
                FROM test_cases
                WHERE question_id = %s
                ORDER BY hidden ASC, id ASC
                """,
                (question_id,),
            )
        else:
            rows = fetch_all(
                """
                SELECT id, input_data, expected_output, hidden
                FROM test_cases
                WHERE question_id = %s AND hidden = FALSE
                ORDER BY id ASC
                """,
                (question_id,),
            )
        return [
            TestCaseItem(id=row["id"], inputData=row["input_data"], expectedOutput=row["expected_output"], hidden=bool(row["hidden"]))
            for row in rows
        ]
