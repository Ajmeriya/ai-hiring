CREATE TABLE IF NOT EXISTS aptitude_question_bank (
    id BIGINT NOT NULL AUTO_INCREMENT,
    job_id BIGINT NOT NULL,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer_index INT NOT NULL,
    explanation TEXT NULL,
    topic VARCHAR(150) NOT NULL,
    difficulty VARCHAR(50) NOT NULL DEFAULT 'medium',
    source VARCHAR(40) NOT NULL DEFAULT 'gemini',
    question_hash CHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_question_hash (question_hash),
    INDEX idx_job_id (job_id),
    INDEX idx_job_topic (job_id, topic),
    INDEX idx_job_difficulty (job_id, difficulty)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS aptitude_question_assignments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    application_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    sequence_order INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_application_question (application_id, question_id),
    INDEX idx_application_id (application_id),
    INDEX idx_question_id (question_id),
    CONSTRAINT fk_aptitude_assignment_question FOREIGN KEY (question_id) REFERENCES aptitude_question_bank (id) ON DELETE CASCADE
) ENGINE=InnoDB;
