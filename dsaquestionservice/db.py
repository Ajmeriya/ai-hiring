"""Database helpers for DSA and SQL questions."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Iterable

import pymysql
from pymysql.cursors import DictCursor

import config

logger = logging.getLogger(__name__)


def get_connection():
    return pymysql.connect(
        host=config.MYSQL_HOST,
        port=config.MYSQL_PORT,
        user=config.MYSQL_USER,
        password=config.MYSQL_PASSWORD,
        database=config.MYSQL_DATABASE,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=False,
    )


def initialize_schema() -> None:
    schema_path = Path(config.BASE_DIR) / "migrations" / "schema.sql"
    if not schema_path.exists():
        logger.warning("Schema file not found: %s", schema_path)
        return

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            statements = [statement.strip() for statement in schema_path.read_text(encoding="utf-8").split(";")]
            for statement in statements:
                if statement:
                    cursor.execute(statement)
        connection.commit()
        logger.info("DSA question schema initialized")
    finally:
        connection.close()


def fetch_one(query: str, params: Iterable | None = None):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            return cursor.fetchone()
    finally:
        connection.close()


def fetch_all(query: str, params: Iterable | None = None):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            return cursor.fetchall()
    finally:
        connection.close()


def execute(query: str, params: Iterable | None = None) -> int:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            rowcount = cursor.execute(query, params)
        connection.commit()
        return rowcount
    finally:
        connection.close()


def execute_many(query: str, values: list[tuple]) -> int:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            rowcount = cursor.executemany(query, values)
        connection.commit()
        return rowcount
    finally:
        connection.close()
