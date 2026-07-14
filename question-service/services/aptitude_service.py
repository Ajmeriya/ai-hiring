"""Business logic for aptitude question banking and generation."""

from __future__ import annotations

import hashlib
import json
import logging
import random
import re
from typing import Any

from langchain_core.prompts import ChatPromptTemplate

import config
from db import execute, execute_many, fetch_all, fetch_one
from models import AptitudeQuestionItem, AptitudeQuestionRequest, AptitudeQuestionResponse

logger = logging.getLogger(__name__)

APTITUDE_STYLE_VERSION = 2


def _normalize_topic(value: str | None) -> str:
    return (value or "General Aptitude").strip() or "General Aptitude"


def _json_loads_from_text(content: str) -> list[dict]:
    text = content.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        if text.endswith("```"):
            text = text[:-3].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("[")
        end = text.rfind("]")
        if start >= 0 and end > start:
            return json.loads(text[start : end + 1])
        raise


def _contains_any(value: str, keywords: list[str]) -> bool:
    lowered = value.lower()
    return any(keyword in lowered for keyword in keywords)


def _looks_generic_question(question_text: str) -> bool:
    return _contains_any(
        question_text,
        [
            "which option best demonstrates strong",
            "which choice correctly completes the logical pattern",
            "if a candidate must solve a quick",
            "which option best demonstrates the correct approach",
            "identify the best reasoning step that demonstrates",
        ],
    )


def _parse_topic_list(topics: list[str] | None) -> list[str]:
    parsed = []
    for topic in topics or []:
        parts = [part.strip() for part in topic.replace("/", ",").split(",")]
        parsed.extend([part for part in parts if part])
    return parsed


def _resolve_categories(topics: list[str] | None) -> list[str]:
    topic_text = " ".join(_parse_topic_list(topics)).lower()
    categories: list[str] = []

    if _contains_any(topic_text, ["quant", "math", "number", "percentage", "ratio", "average", "profit", "loss", "time and work", "time", "speed", "distance", "arithmetic"]):
        categories.append("quantitative")
    if _contains_any(topic_text, ["logic", "reason", "puzzle", "series", "coding", "arrangement", "direction", "syllog", "statement"]):
        categories.append("logical")
    if _contains_any(topic_text, ["verbal", "english", "grammar", "synonym", "antonym", "comprehension", "reading"]):
        categories.append("verbal")
    if _contains_any(topic_text, ["data", "table", "chart", "graph", "interpretation", "di", "analytics"]):
        categories.append("data_interpretation")

    if not categories:
        categories = ["quantitative", "logical", "data_interpretation", "verbal"]

    return categories


def _rotate_correct_answer(options: list[str], correct_answer: str, seed: str) -> tuple[list[str], int]:
    rng = random.Random(seed)
    shuffled = list(dict.fromkeys(options))
    if correct_answer not in shuffled:
        shuffled.append(correct_answer)
    while len(shuffled) < 4:
        shuffled.append(f"Option {len(shuffled) + 1}")
    rng.shuffle(shuffled)
    correct_index = shuffled.index(correct_answer)
    return shuffled[:4], correct_index


def _normalize_difficulty(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized in {"easy", "medium", "hard"}:
        return normalized
    return "hard"


def _pattern_signature(question_text: str) -> str:
    tokens = [token.strip("?,.:;!()[]{}\"'").lower() for token in question_text.split()]
    cleaned = [token for token in tokens if token and not re.search(r"\d", token)]
    return " ".join(cleaned[:7])


class GeminiQuestionGenerator:
    def __init__(self) -> None:
        self.client = None
        self.last_generation_source = "none"
        self.gemini_disabled_reason: str | None = None
        if not config.GEMINI_API_KEY:
            logger.warning("Gemini API key missing. Question generation will use fallback templates only.")
            return

        try:
            from langchain_google_genai import ChatGoogleGenerativeAI

            self.client = ChatGoogleGenerativeAI(
                model=config.GEMINI_MODEL,
                google_api_key=config.GEMINI_API_KEY,
                temperature=0.7,
            )
        except Exception as exc:
            logger.exception("Failed to initialize Gemini model: %s", exc)
            self.client = None

    def is_available(self) -> bool:
        return self.client is not None

    def get_last_generation_source(self) -> str:
        return self.last_generation_source

    def generate(self, request: AptitudeQuestionRequest, count: int) -> list[dict]:
        categories = _resolve_categories(request.topics)
        normalized_difficulty = _normalize_difficulty(request.difficulty)
        if self.gemini_disabled_reason:
            logger.info("Gemini disabled for this process (%s); using fallback templates", self.gemini_disabled_reason)
            self.last_generation_source = f"fallback:{self.gemini_disabled_reason}"
            fallback_questions = self._fallback_questions(request, count)
            for question in fallback_questions:
                question["__source"] = "fallback"
            logger.info("Question source=fallback reason=%s count=%s", self.gemini_disabled_reason, len(fallback_questions))
            return fallback_questions

        prompt = ChatPromptTemplate.from_messages([
                        (
                                "system",
                                '''You are an expert aptitude assessment generator used in enterprise AI hiring platforms.
Your task is to generate HIGH-QUALITY, NON-REPETITIVE aptitude questions for technical recruitment exams.

STRICT OUTPUT RULES:
- Return ONLY valid JSON.
- No markdown.
- No explanations outside JSON.
- No numbering like Q1/Q2.
- Output must be a JSON array.

QUESTION QUALITY RULES:
- Every question must feel unique.
- Never repeat the same question pattern, structure, formula style, wording style, or logic flow.
- Avoid template-like questions.
- Randomize sentence structure naturally.
- Avoid obvious AI-generated patterns.
- Avoid repeating numerical styles repeatedly.
- Use realistic aptitude exam difficulty.
- Questions should resemble real company assessment tests.

APTITUDE COVERAGE RULES:
- Mix categories naturally.
- Include quantitative aptitude, logical reasoning, verbal reasoning, analytical thinking, coding-decoding, data interpretation, probability, percentages, ratio-proportion, averages, time-work, time-speed-distance, puzzles, and pattern recognition.
- Do NOT generate opinion-based questions.
- Do NOT generate theoretical technology questions.
- Do NOT mention frameworks, programming languages, or recruiter skills unless contextually necessary.

DISTRACTOR RULES:
- Each question must contain exactly 4 options.
- Only one option should be correct.
- Wrong options must be believable.
- Avoid obviously wrong distractors.
- Randomize correct answer position.
- Ensure answer distribution is balanced.

ANTI-REPETITION RULES:
- Never reuse the same scenario.
- Never reuse identical mathematical operations.
- Never reuse identical sentence openings.
- Never create multiple questions with identical solving methods.
- Ensure semantic diversity across all generated questions.
- Ensure lexical diversity across all generated questions.
- Each generated batch must feel independently authored.

DIFFICULTY RULES:
- Difficulty should match recruiter requirements.
- Easy questions should test fundamentals.
- Medium questions should require multi-step thinking.
- Hard questions should require analytical reasoning.

JSON FORMAT:
[{{
        "question": "string",
        "options": ["A", "B", "C", "D"],
        "correct_answer_index": 0,
        "explanation": "short explanation",
        "topic": "topic name",
        "difficulty": "easy|medium|hard"
    }}]
''',
                        ),
            (
                "human",
                '''Generate {count} unique aptitude questions.

Recruiter Configuration:
- Job Title: {job_title}
- Job Description: {job_description}
- Required Skills: {required_skills}
- Topics Requested: {topics}
- Recruiter Topics Raw: {recruiter_topics_raw}
- Categories: {categories}
- Difficulty Level: {difficulty}
- Aptitude Type: {aptitude_type}
- Aptitude Time (minutes): {aptitude_time}

Generation Instructions:
- Create fresh questions.
- Avoid repetition completely.
- Ensure question diversity.
- Use different reasoning styles.
- Mix numerical and logical thinking.
- Maintain professional hiring assessment quality.
- Keep language concise and human-like.
- Return only valid JSON array.''',
            ),
        ])

        if not self.client:
            self.last_generation_source = "fallback:client_unavailable"
            fallback_questions = self._fallback_questions(request, count)
            for question in fallback_questions:
                question["__source"] = "fallback"
            logger.info("Question source=fallback reason=client_unavailable count=%s", len(fallback_questions))
            return fallback_questions

        try:
            chain = prompt | self.client
            response = chain.invoke(
                {
                    "count": count,
                    "job_title": request.job_title,
                    "job_description": request.job_description,
                    "required_skills": ", ".join(request.required_skills) if request.required_skills else "aptitude reasoning",
                    "topics": ", ".join(_parse_topic_list(request.topics)) if request.topics else "quantitative reasoning, logical reasoning, data interpretation, verbal ability",
                    "recruiter_topics_raw": request.recruiter_topics_raw or ", ".join(_parse_topic_list(request.topics)),
                    "categories": ", ".join(categories),
                    "difficulty": normalized_difficulty,
                    "aptitude_type": request.aptitude_type,
                    "aptitude_time": request.aptitude_time,
                }
            )
        except Exception as exc:
            if "RESOURCE_EXHAUSTED" in str(exc).upper() or "quota exceeded" in str(exc).lower() or "Please retry in" in str(exc):
                self.gemini_disabled_reason = "quota_exhausted"
                logger.warning("Gemini quota exhausted; switching to fallback templates for the rest of this process")
            elif "PermissionDenied" in str(exc) or "leaked" in str(exc).lower():
                self.gemini_disabled_reason = "permission_denied"
                logger.warning("Gemini permission denied; switching to fallback templates for the rest of this process")
            logger.exception("Gemini generation failed, falling back to templates: %s", exc)
            self.last_generation_source = "fallback:gemini_invoke_error"
            fallback_questions = self._fallback_questions(request, count)
            for question in fallback_questions:
                question["__source"] = "fallback"
            logger.info("Question source=fallback reason=gemini_invoke_error count=%s", len(fallback_questions))
            return fallback_questions

        content = getattr(response, "content", str(response))
        try:
            generated_questions = _json_loads_from_text(content)
            if isinstance(generated_questions, list):
                for question in generated_questions:
                    if isinstance(question, dict):
                        question.setdefault("__source", "gemini")
            self.last_generation_source = "gemini"
            logger.info("Question source=gemini count=%s", len(generated_questions) if isinstance(generated_questions, list) else 0)
            return generated_questions
        except Exception as exc:
            logger.exception("Failed to parse Gemini questions: %s", exc)
            self.last_generation_source = "fallback:gemini_parse_error"
            fallback_questions = self._fallback_questions(request, count)
            for question in fallback_questions:
                question["__source"] = "fallback"
            logger.info("Question source=fallback reason=gemini_parse_error count=%s", len(fallback_questions))
            return fallback_questions

    def _fallback_questions(self, request: AptitudeQuestionRequest, count: int) -> list[dict]:
        categories = _resolve_categories(request.topics)
        topics = _parse_topic_list(request.topics) or ["Aptitude"]
        normalized_difficulty = _normalize_difficulty(request.difficulty)
        questions = []
        used_stems: dict[str, set[str]] = {
            "quantitative": set(),
            "logical": set(),
            "data_interpretation": set(),
            "verbal": set(),
        }
        for index in range(count):
            category = categories[index % len(categories)]
            topic = topics[index % len(topics)]
            rng = random.Random(f"{request.job_id}:{index}:{category}")

            if category == "quantitative":
                quant_stems = ["percentage", "ratio", "average", "time_work"]
                available_stems = [stem for stem in quant_stems if stem not in used_stems["quantitative"]]
                stem_type = rng.choice(available_stems or quant_stems)
                used_stems["quantitative"].add(stem_type)
                if stem_type == "percentage":
                    price = rng.randrange(200, 901, 50)
                    discount = rng.choice([10, 12, 15, 20, 25])
                    correct_value = round(price * (100 - discount) / 100)
                    wrong_values = [correct_value + delta for delta in (20, 30, 40)]
                    question = f"An item marked at ₹{price} is sold after a {discount}% discount. What is the selling price?"
                    options, correct_index = _rotate_correct_answer([str(correct_value)] + [str(v) for v in wrong_values], str(correct_value), str(rng.random()))
                    explanation = f"A {discount}% discount means the item sells for {100 - discount}% of ₹{price}, which is ₹{correct_value}."
                elif stem_type == "ratio":
                    total = rng.choice([36, 48, 54, 72, 96])
                    ratio_a = rng.choice([2, 3, 4, 5])
                    ratio_b = rng.choice([3, 4, 5, 6])
                    base = total // (ratio_a + ratio_b)
                    correct_value = ratio_a * base
                    wrong_values = [correct_value + base, correct_value + 2 * base, max(1, correct_value - base)]
                    question = f"The ratio of boys to girls in a class is {ratio_a}:{ratio_b} and the total number of students is {total}. How many boys are there?"
                    options, correct_index = _rotate_correct_answer([str(correct_value)] + [str(v) for v in wrong_values], str(correct_value), str(rng.random()))
                    explanation = f"The total has {ratio_a + ratio_b} parts, so each part is {base} and boys are {ratio_a} parts, i.e. {correct_value}."
                elif stem_type == "average":
                    values = [rng.randint(10, 60) for _ in range(4)]
                    correct_value = sum(values) // len(values)
                    wrong_values = [correct_value + 2, max(1, correct_value - 2), correct_value + 4]
                    question = f"The scores of four students are {values[0]}, {values[1]}, {values[2]}, and {values[3]}. What is the average score?"
                    options, correct_index = _rotate_correct_answer([str(correct_value)] + [str(v) for v in wrong_values], str(correct_value), str(rng.random()))
                    explanation = f"Average = total of all scores divided by 4, giving {correct_value}."
                else:
                    speed = rng.choice([30, 40, 45, 50, 60])
                    time = rng.choice([2, 3, 4, 5])
                    correct_value = speed * time
                    wrong_values = [correct_value + speed, max(1, correct_value - speed), correct_value + 2 * speed]
                    question = f"A car travels at {speed} km/h for {time} hours. How far does it travel?"
                    options, correct_index = _rotate_correct_answer([str(correct_value)] + [str(v) for v in wrong_values], str(correct_value), str(rng.random()))
                    explanation = f"Distance = speed × time = {speed} × {time} = {correct_value} km."

                questions.append({"question": question, "options": options, "correct_answer_index": correct_index, "explanation": explanation, "topic": "Quantitative Reasoning", "difficulty": normalized_difficulty})
                continue

            if category == "logical":
                logic_stems = ["series", "direction", "coding", "syllogism"]
                available_stems = [stem for stem in logic_stems if stem not in used_stems["logical"]]
                stem_type = rng.choice(available_stems or logic_stems)
                used_stems["logical"].add(stem_type)
                if stem_type == "series":
                    start = rng.choice([2, 3, 5, 7])
                    diff = rng.choice([2, 3, 4])
                    numbers = [start]
                    for i in range(1, 4):
                        numbers.append(numbers[-1] + diff + i * 2)
                    correct_value = numbers[-1] + diff + 8
                    wrong_values = [correct_value + 2, max(1, correct_value - 2), correct_value + 4]
                    question = f"What is the next number in the series: {numbers[0]}, {numbers[1]}, {numbers[2]}, {numbers[3]}, ?"
                    options, correct_index = _rotate_correct_answer([str(correct_value)] + [str(v) for v in wrong_values], str(correct_value), str(rng.random()))
                    explanation = "The pattern increases by growing differences, so the next term follows the same progression."
                elif stem_type == "direction":
                    question = "A person walks 3 km north, then 4 km east, then 3 km south. How far and in which direction is the person from the starting point?"
                    correct_value = "4 km east"
                    wrong_values = ["4 km west", "3 km east", "7 km east"]
                    options, correct_index = _rotate_correct_answer([correct_value] + wrong_values, correct_value, str(rng.random()))
                    explanation = "The north and south movements cancel out, leaving a net displacement of 4 km east."
                elif stem_type == "coding":
                    question = "If RED is coded as UHG, how is BLUE coded using the same pattern?"
                    correct_value = "EOXH"
                    wrong_values = ["DMVF", "FOYI", "BKTG"]
                    options, correct_index = _rotate_correct_answer([correct_value] + wrong_values, correct_value, str(rng.random()))
                    explanation = "Each letter is shifted three positions forward in the alphabet."
                else:
                    question = "All pens are books. Some books are papers. Which statement is definitely true?"
                    correct_value = "Some books are papers"
                    wrong_values = ["All papers are pens", "Some pens are papers", "All pens are papers"]
                    options, correct_index = _rotate_correct_answer([correct_value] + wrong_values, correct_value, str(rng.random()))
                    explanation = "The statement 'Some books are papers' is directly given, so it is definitely true."

                questions.append({"question": question, "options": options, "correct_answer_index": correct_index, "explanation": explanation, "topic": "Logical Reasoning", "difficulty": normalized_difficulty})
                continue

            if category == "data_interpretation":
                di_stems = ["table_average", "table_total", "percentage_increase"]
                available_stems = [stem for stem in di_stems if stem not in used_stems["data_interpretation"]]
                stem_type = rng.choice(available_stems or di_stems)
                used_stems["data_interpretation"].add(stem_type)

                if stem_type == "table_total":
                    sales = [rng.randint(80, 180) for _ in range(4)]
                    question = f"A company sold {sales[0]}, {sales[1]}, {sales[2]}, and {sales[3]} units in four consecutive quarters. What is the total annual sales?"
                    correct_value = str(sum(sales))
                    wrong_values = [str(sum(sales) + 20), str(max(1, sum(sales) - 20)), str(sum(sales) + 40)]
                    explanation = f"Total annual sales is the sum of all four quarters, which is {correct_value}."
                elif stem_type == "percentage_increase":
                    q1 = rng.randint(80, 140)
                    q2 = q1 + rng.randint(10, 40)
                    increase = round(((q2 - q1) / q1) * 100)
                    question = f"Sales increased from {q1} units in Quarter 1 to {q2} units in Quarter 2. What is the approximate percentage increase?"
                    correct_value = str(increase)
                    wrong_values = [str(max(1, increase - 5)), str(increase + 5), str(increase + 10)]
                    explanation = f"Percentage increase = (({q2} - {q1}) / {q1}) × 100, which is about {increase}%."
                else:
                    sales = [rng.randint(80, 180) for _ in range(4)]
                    question = f"A company sold {sales[0]}, {sales[1]}, {sales[2]}, and {sales[3]} units in four consecutive quarters. What was the average quarterly sales?"
                    correct_value = str(sum(sales) // 4)
                    wrong_values = [str((sum(sales) // 4) + 10), str(max(1, (sum(sales) // 4) - 10)), str((sum(sales) // 4) + 20)]
                    explanation = f"Average quarterly sales equals total sales divided by 4, which is {correct_value}."

                options, correct_index = _rotate_correct_answer([correct_value] + wrong_values, correct_value, str(rng.random()))
                questions.append({"question": question, "options": options, "correct_answer_index": correct_index, "explanation": explanation, "topic": "Data Interpretation", "difficulty": normalized_difficulty})
                continue

            verbal_stems = ["synonym", "antonym", "analogy", "sentence_completion"]
            available_stems = [stem for stem in verbal_stems if stem not in used_stems["verbal"]]
            stem_type = rng.choice(available_stems or verbal_stems)
            used_stems["verbal"].add(stem_type)

            if stem_type == "antonym":
                word = rng.choice(["optimistic", "expand", "accept", "maximum"])
                antonym_map = {
                    "optimistic": ("pessimistic", ["hopeful", "joyful", "confident"]),
                    "expand": ("contract", ["increase", "develop", "extend"]),
                    "accept": ("reject", ["agree", "allow", "approve"]),
                    "maximum": ("minimum", ["highest", "largest", "greatest"]),
                }
                correct_value, wrong_values = antonym_map[word]
                question = f"Choose the opposite meaning of '{word}'."
                explanation = f"'{correct_value}' is the opposite meaning of '{word}'."
            elif stem_type == "analogy":
                question = "Book is to Author as Painting is to _____."
                correct_value = "Artist"
                wrong_values = ["Brush", "Gallery", "Color"]
                explanation = "An author creates a book, just as an artist creates a painting."
            elif stem_type == "sentence_completion":
                question = "Choose the best word to complete the sentence: The manager was _____ enough to handle the crisis calmly."
                correct_value = "competent"
                wrong_values = ["fragile", "absent", "careless"]
                explanation = "'Competent' correctly describes someone capable of handling a crisis."
            else:
                word = rng.choice(["brief", "expand", "concise", "accurate"])
                synonym_map = {
                    "brief": ("short", ["loud", "slow", "heavy"]),
                    "expand": ("increase", ["reduce", "hide", "delay"]),
                    "concise": ("succinct", ["detailed", "unclear", "weak"]),
                    "accurate": ("correct", ["random", "late", "rough"]),
                }
                correct_value, wrong_values = synonym_map[word]
                question = f"Choose the closest synonym of '{word}'."
                explanation = f"'{word}' is closest in meaning to '{correct_value}'."

            options, correct_index = _rotate_correct_answer([correct_value] + wrong_values, correct_value, str(rng.random()))
            questions.append({"question": question, "options": options, "correct_answer_index": correct_index, "explanation": explanation, "topic": "Verbal Ability", "difficulty": normalized_difficulty})
        return questions


class AptitudeQuestionService:
    def __init__(self) -> None:
        self.generator = GeminiQuestionGenerator()

    def health(self) -> dict:
        return {
            "status": "ok",
            "geminiAvailable": self.generator.is_available(),
            "databaseReady": True,
        }

    def assign_questions(self, request: AptitudeQuestionRequest) -> AptitudeQuestionResponse:
        self._ensure_bank(request)
        bank_size = self._bank_size(request.job_id)

        assigned_rows = fetch_all(
            """
            SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
                   q.correct_answer_index, q.explanation, q.topic, q.difficulty, q.source
            FROM aptitude_question_assignments a
            JOIN aptitude_question_bank q ON q.id = a.question_id
            WHERE a.application_id = %s
            ORDER BY a.sequence_order ASC
            """,
            (request.application_id,),
        )

        if assigned_rows and len(assigned_rows) >= request.count:
            source_summary: dict[str, int] = {}
            for row in assigned_rows[: request.count]:
                source = str(row.get("source") or "db")
                source_summary[source] = source_summary.get(source, 0) + 1
            logger.info("Question source=db-assignment applicationId=%s summary=%s", request.application_id, source_summary)
            questions = [self._to_item(row) for row in assigned_rows[: request.count]]
            bank_size = self._bank_size(request.job_id)
            return AptitudeQuestionResponse(
                applicationId=request.application_id,
                jobId=request.job_id,
                count=request.count,
                poolSize=max(request.count, bank_size),
                bankSize=bank_size,
                generatedCount=0,
                questions=questions,
            )

        selection_pool = fetch_all(
            """
            SELECT id, question_text, option_a, option_b, option_c, option_d,
                   correct_answer_index, explanation, topic, difficulty, source
            FROM aptitude_question_bank
            WHERE job_id = %s
              AND id NOT IN (SELECT question_id FROM aptitude_question_assignments)
            ORDER BY RAND()
            LIMIT %s
            """,
            (request.job_id, max(request.count * 8, 40)),
        )

        selection = self._select_diverse_questions(selection_pool, request.count)
        if selection:
            source_summary: dict[str, int] = {}
            for row in selection:
                source = str(row.get("source") or "db")
                source_summary[source] = source_summary.get(source, 0) + 1
            logger.info("Question source=db-random applicationId=%s summary=%s", request.application_id, source_summary)

        # If we couldn't find enough *unassigned* questions, allow reuse as a last resort
        if not selection:
            logger.info("No unassigned questions available for job %s; attempting to reuse assigned questions as fallback", request.job_id)
            fallback_pool = fetch_all(
                """
                SELECT id, question_text, option_a, option_b, option_c, option_d,
                       correct_answer_index, explanation, topic, difficulty, source
                FROM aptitude_question_bank
                WHERE job_id = %s
                ORDER BY RAND()
                LIMIT %s
                """,
                (request.job_id, max(request.count * 8, 40)),
            )

            selection = self._select_diverse_questions(fallback_pool, request.count)
            if selection:
                source_summary: dict[str, int] = {}
                for row in selection:
                    source = str(row.get("source") or "db")
                    source_summary[source] = source_summary.get(source, 0) + 1
                logger.info("Question source=db-reuse-assigned applicationId=%s summary=%s", request.application_id, source_summary)

        if not selection:
            raise ValueError("Unable to generate aptitude questions for this job")

        execute("DELETE FROM aptitude_question_assignments WHERE application_id = %s", (request.application_id,))

        insert_values = [
            (request.application_id, row["id"], position + 1)
            for position, row in enumerate(selection)
        ]
        execute_many(
            "INSERT INTO aptitude_question_assignments (application_id, question_id, sequence_order) VALUES (%s, %s, %s)",
            insert_values,
        )

        bank_size = self._bank_size(request.job_id)
        questions = [self._to_item(row) for row in selection]
        return AptitudeQuestionResponse(
            applicationId=request.application_id,
            jobId=request.job_id,
            count=request.count,
            poolSize=max(request.count, bank_size),
            bankSize=bank_size,
            generatedCount=0,
            questions=questions,
        )

    def _ensure_bank(self, request: AptitudeQuestionRequest) -> None:
        target_pool = request.count
        current_size = self._bank_size(request.job_id)

        if current_size and self._bank_needs_refresh(request.job_id):
            logger.info("Refreshing stale aptitude bank for job %s", request.job_id)
            execute("DELETE FROM aptitude_question_bank WHERE job_id = %s", (request.job_id,))
            current_size = 0

        if current_size >= target_pool:
            return

        generated_questions = self.generator.generate(request, target_pool)
        if not generated_questions:
            return

        rows: list[tuple] = []
        source_summary: dict[str, int] = {}
        for question in generated_questions:
            options = question.get("options") or []
            while len(options) < 4:
                options.append(f"Option {len(options) + 1}")

            normalized_question = str(question.get("question", "")).strip()
            if not normalized_question:
                continue

            question_hash = hashlib.sha256(f"{request.job_id}:{normalized_question.lower()}".encode("utf-8")).hexdigest()
            question_source = str(question.get("__source") or ("gemini" if self.generator.is_available() else "fallback"))
            rows.append(
                (
                    request.job_id,
                    normalized_question,
                    options[0][:500],
                    options[1][:500],
                    options[2][:500],
                    options[3][:500],
                    int(question.get("correct_answer_index", 0)) % 4,
                    str(question.get("explanation", "")).strip(),
                    _normalize_topic(str(question.get("topic", ""))),
                    str(question.get("difficulty", request.difficulty or "medium")).strip() or request.difficulty,
                    question_source,
                    question_hash,
                )
            )
            source_summary[question_source] = source_summary.get(question_source, 0) + 1

        if rows:
            execute_many(
                """
                INSERT IGNORE INTO aptitude_question_bank (
                    job_id, question_text, option_a, option_b, option_c, option_d,
                    correct_answer_index, explanation, topic, difficulty, source, question_hash
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                rows,
            )
            logger.info(
                "Question source=generated applicationId=%s jobId=%s count=%s summary=%s mode=%s",
                request.application_id,
                request.job_id,
                len(rows),
                source_summary,
                self.generator.get_last_generation_source(),
            )

    def _bank_size(self, job_id: int) -> int:
        row = fetch_one("SELECT COUNT(*) AS total FROM aptitude_question_bank WHERE job_id = %s", (job_id,))
        return int(row["total"] if row else 0)

    def _bank_needs_refresh(self, job_id: int) -> bool:
        sample_rows = fetch_all(
            "SELECT question_text FROM aptitude_question_bank WHERE job_id = %s ORDER BY created_at DESC LIMIT 20",
            (job_id,),
        )
        if not sample_rows:
            return False

        generic_count = sum(1 for row in sample_rows if _looks_generic_question(str(row.get("question_text", ""))))
        return generic_count >= max(3, int(len(sample_rows) * 0.6))

    def _select_diverse_questions(self, rows: list[dict], count: int) -> list[dict]:
        if not rows:
            return []

        selected: list[dict] = []
        seen_signatures: set[str] = set()

        for row in rows:
            signature = _pattern_signature(str(row.get("question_text", "")))
            if signature in seen_signatures:
                continue
            seen_signatures.add(signature)
            selected.append(row)
            if len(selected) >= count:
                return selected

        for row in rows:
            if row in selected:
                continue
            selected.append(row)
            if len(selected) >= count:
                break

        return selected[:count]

    @staticmethod
    def _to_item(row: dict) -> AptitudeQuestionItem:
        return AptitudeQuestionItem(
            id=row["id"],
            question=row["question_text"],
            options=[row["option_a"], row["option_b"], row["option_c"], row["option_d"]],
            correctAnswerIndex=row["correct_answer_index"],
            explanation=row.get("explanation") or "",
            topic=row.get("topic") or "General Aptitude",
            difficulty=row.get("difficulty") or "medium",
        )
