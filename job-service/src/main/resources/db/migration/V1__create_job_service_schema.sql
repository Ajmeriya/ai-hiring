create table job_postings (
    id bigint not null auto_increment,
    recruiter_id varchar(100) not null,
    recruiter_name varchar(150),
    title varchar(255) not null,
    department varchar(255) not null,
    salary_range varchar(120) not null,
    description text not null,
    status varchar(20) not null,
    posted_date date not null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id)
);

create table job_skills (
    id bigint not null auto_increment,
    job_id bigint not null,
    skill_name varchar(150) not null,
    primary key (id),
    constraint fk_job_skills_job foreign key (job_id) references job_postings (id) on delete cascade
);

create table assessment_plans (
    id bigint not null auto_increment,
    job_id bigint not null,
    primary key (id),
    constraint uk_assessment_plan_job unique (job_id),
    constraint fk_assessment_plan_job foreign key (job_id) references job_postings (id) on delete cascade
);

create table assessment_rounds (
    id bigint not null auto_increment,
    assessment_plan_id bigint not null,
    round_type varchar(40) not null,
    enabled bit not null,
    sequence_order int not null,
    question_count int null,
    question_type varchar(40) null,
    time_limit_minutes int null,
    primary key (id),
    constraint fk_assessment_round_plan foreign key (assessment_plan_id) references assessment_plans (id) on delete cascade
);

create table round_topics (
    id bigint not null auto_increment,
    assessment_round_id bigint not null,
    topic_name varchar(150) not null,
    primary key (id),
    constraint fk_round_topics_round foreign key (assessment_round_id) references assessment_rounds (id) on delete cascade
);

create index idx_job_postings_recruiter_id on job_postings (recruiter_id);
create index idx_job_postings_status on job_postings (status);
create index idx_job_skills_job_id on job_skills (job_id);
create index idx_assessment_rounds_plan_id on assessment_rounds (assessment_plan_id);
create index idx_round_topics_round_id on round_topics (assessment_round_id);