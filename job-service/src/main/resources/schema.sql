CREATE TABLE IF NOT EXISTS jobs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    department VARCHAR(255) NOT NULL,
    salary VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    required_experience_years INT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS job_skills (
    id BIGINT NOT NULL AUTO_INCREMENT,
    job_id BIGINT NOT NULL,
    skill VARCHAR(150) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_job_skills_job FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS job_rounds (
    id BIGINT NOT NULL AUTO_INCREMENT,
    job_id BIGINT NOT NULL,
    aptitude_enabled BIT NOT NULL,
    technical_enabled BIT NOT NULL,
    interview_enabled BIT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_job_rounds_job UNIQUE (job_id),
    CONSTRAINT fk_job_rounds_job FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS aptitude_configs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    job_id BIGINT NOT NULL,
    num_questions INT NULL,
    topics TEXT NULL,
    type VARCHAR(80) NULL,
    time INT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_aptitude_configs_job UNIQUE (job_id),
    CONSTRAINT fk_aptitude_configs_job FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS technical_configs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    job_id BIGINT NOT NULL,
    dsa_questions INT NULL,
    dsa_topics TEXT NULL,
    sql_questions INT NULL,
    sql_topics TEXT NULL,
    time INT NULL,
    dsa_difficulty VARCHAR(255) NULL,
    sql_difficulty VARCHAR(255) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_technical_configs_job UNIQUE (job_id),
    CONSTRAINT fk_technical_configs_job FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS interview_configs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    job_id BIGINT NOT NULL,
    duration INT NULL,
    topics TEXT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_interview_configs_job UNIQUE (job_id),
    CONSTRAINT fk_interview_configs_job FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
) ENGINE=InnoDB;
