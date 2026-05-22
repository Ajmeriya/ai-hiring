-- Clear all job-service application data
-- Run with: mysql -u <user> -p ai_hiring_jobs < clear_data.sql

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE job_skills;
TRUNCATE TABLE aptitude_configs;
TRUNCATE TABLE technical_configs;
TRUNCATE TABLE interview_configs;
TRUNCATE TABLE job_rounds;
TRUNCATE TABLE jobs;
SET FOREIGN_KEY_CHECKS = 1;

-- Reset AUTO_INCREMENT values if needed (MySQL-specific)
ALTER TABLE jobs AUTO_INCREMENT = 1;
ALTER TABLE job_rounds AUTO_INCREMENT = 1;
ALTER TABLE aptitude_configs AUTO_INCREMENT = 1;
ALTER TABLE technical_configs AUTO_INCREMENT = 1;
ALTER TABLE interview_configs AUTO_INCREMENT = 1;
ALTER TABLE job_skills AUTO_INCREMENT = 1;
