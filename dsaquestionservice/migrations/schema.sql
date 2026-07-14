CREATE TABLE IF NOT EXISTS coding_questions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    question_hash CHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    statement LONGTEXT NOT NULL,
    topic VARCHAR(150) NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    tags TEXT NOT NULL,
    constraints_text LONGTEXT NOT NULL,
    input_format LONGTEXT NOT NULL,
    output_format LONGTEXT NOT NULL,
    starter_code_cpp LONGTEXT NOT NULL,
    starter_code_java LONGTEXT NOT NULL,
    starter_code_python LONGTEXT NOT NULL,
    starter_code_sql LONGTEXT NULL,
    solution_code LONGTEXT NOT NULL,
    time_limit_ms INT NOT NULL DEFAULT 2000,
    memory_limit_mb INT NOT NULL DEFAULT 256,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_question_hash (question_hash),
    INDEX idx_topic_difficulty (topic, difficulty)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS test_cases (
    id BIGINT NOT NULL AUTO_INCREMENT,
    question_id BIGINT NOT NULL,
    input_data LONGTEXT NOT NULL,
    expected_output LONGTEXT NOT NULL,
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_question_id (question_id),
    INDEX idx_hidden (hidden),
    CONSTRAINT fk_test_case_question FOREIGN KEY (question_id) REFERENCES coding_questions (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS question_assignments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    application_id BIGINT NOT NULL,
    job_id BIGINT NOT NULL,
    assignment_signature CHAR(64) NOT NULL,
    request_json LONGTEXT NOT NULL,
    question_ids_json LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_application_job (application_id, job_id),
    UNIQUE KEY uk_assignment_signature (assignment_signature)
) ENGINE=InnoDB;
