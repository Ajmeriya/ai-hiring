"""Shared helpers for the seeded coding question catalog."""

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


def coding_question(**kwargs):
    item = {
        "tags": kwargs.get("tags", []),
        "constraints_text": kwargs.get("constraints_text", ""),
        "input_format": kwargs.get("input_format", ""),
        "output_format": kwargs.get("output_format", ""),
        "starter_code_cpp": kwargs.get("starter_code_cpp", CPP_STARTER),
        "starter_code_java": kwargs.get("starter_code_java", JAVA_STARTER),
        "starter_code_python": kwargs.get("starter_code_python", PYTHON_STARTER),
        "starter_code_sql": kwargs.get("starter_code_sql", SQL_STARTER),
        "time_limit_ms": kwargs.get("time_limit_ms", 2000),
        "memory_limit_mb": kwargs.get("memory_limit_mb", 256),
        "test_cases": kwargs.get("test_cases", []),
    }
    item.update(kwargs)
    return item


def sql_question(**kwargs):
    kwargs.setdefault("starter_code_cpp", CPP_STARTER)
    kwargs.setdefault("starter_code_java", JAVA_STARTER)
    kwargs.setdefault("starter_code_python", PYTHON_STARTER)
    kwargs.setdefault("starter_code_sql", SQL_STARTER)
    return coding_question(**kwargs)
