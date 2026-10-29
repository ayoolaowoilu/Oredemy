
CREATE DATABASE IF NOT EXISTS ordemy;
use ordemy;


-- 1. Schools
CREATE TABLE schools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    calendar_offset INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Faculties belong to schools
CREATE TABLE faculties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    school_id INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_faculties_school
        FOREIGN KEY (school_id)
        REFERENCES schools(id)
        ON DELETE CASCADE
);

CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    faculty_id INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_departments_faculty
        FOREIGN KEY (faculty_id)
        REFERENCES faculties(id)
        ON DELETE CASCADE
);

-- 4. Users
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,

    faculty_id INT NULL,
    department_id INT NULL,
    session VARCHAR(50) NULL,
    admission_session VARCHAR(50) NULL,

    role ENUM('lecturer', 'admin', 'student')
        NOT NULL DEFAULT 'student',

    is_verified BOOLEAN NOT NULL DEFAULT FALSE,

    image TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_faculty
        FOREIGN KEY (faculty_id)
        REFERENCES faculties(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_users_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE SET NULL
);

CREATE TABLE class_rep_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    department_id INT NOT NULL,
    session VARCHAR(50) NOT NULL,
    message VARCHAR(1000) NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    reviewed_by VARCHAR(36) NULL,
    decision_note VARCHAR(1000) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    INDEX idx_class_rep_department_session_status (department_id, session, status),
    CONSTRAINT fk_class_rep_student
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_class_rep_department
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_class_rep_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE queries(
     id INT PRIMARY KEY AUTO_INCREMENT,
     subject VARCHAR(100) NOT NULL,
     query text not null,
     query_type ENUM('Results','Facilities','Timetable','Other') DEFAULT 'Other',
     user_id VARCHAR(36) NOT NULL,
     query_for ENUM('Faculty','Department','School') DEFAULT 'Department',
     session varchar(200),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_queries_session_user (session, user_id),
     INDEX idx_queries_session_type_created (session, query_type, created_at),
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE chat_conversations (
    id VARCHAR(36) PRIMARY KEY,
    type ENUM('support', 'lecturer', 'class') NOT NULL,
    student_id VARCHAR(36) NULL,
    lecturer_id VARCHAR(36) NULL,
    class_department_id INT NULL,
    class_session VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_chat_conversations_student (student_id, updated_at),
    INDEX idx_chat_conversations_lecturer (lecturer_id, updated_at),
    UNIQUE KEY uq_chat_conversations_class (type, class_department_id, class_session),
    CONSTRAINT fk_chat_conversations_student
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_conversations_lecturer
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_conversations_class_department
        FOREIGN KEY (class_department_id) REFERENCES departments(id) ON DELETE CASCADE
);

CREATE TABLE chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    query_id INT NULL,
    body MEDIUMTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_chat_messages_conversation (conversation_id, id),
    UNIQUE KEY uq_chat_messages_query (query_id),
    CONSTRAINT fk_chat_messages_conversation
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_messages_sender
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_messages_query
        FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE SET NULL
);

CREATE TABLE chat_read_receipts (
    conversation_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    last_read_message_id BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id),
    CONSTRAINT fk_chat_read_receipts_conversation
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_read_receipts_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE adviser_ai_runs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    lecturer_id VARCHAR(36) NOT NULL,
    department_id INT NOT NULL,
    slot_key VARCHAR(19) NOT NULL,
    status ENUM('running', 'completed', 'failed') NOT NULL,
    question_count INT NOT NULL DEFAULT 0,
    severity ENUM('normal', 'critical') NOT NULL DEFAULT 'normal',
    error_message VARCHAR(1000) NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    UNIQUE KEY uq_adviser_ai_run_slot (lecturer_id, slot_key),
    INDEX idx_adviser_ai_run_lecturer (lecturer_id, started_at),
    CONSTRAINT fk_adviser_ai_run_lecturer
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_adviser_ai_run_department
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

CREATE TABLE adviser_ai_groups (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    run_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    question_ids JSON NOT NULL,
    draft_reply TEXT NOT NULL,
    status ENUM('pending', 'sent') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    INDEX idx_adviser_ai_group_run (run_id, status),
    CONSTRAINT fk_adviser_ai_group_run
        FOREIGN KEY (run_id) REFERENCES adviser_ai_runs(id) ON DELETE CASCADE
);

CREATE TABLE adviser_ai_scheduler_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    lecturer_id VARCHAR(36) NULL,
    event_type VARCHAR(40) NOT NULL,
    details VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_adviser_scheduler_log_created (created_at),
    INDEX idx_adviser_scheduler_log_lecturer (lecturer_id, created_at),
    CONSTRAINT fk_adviser_scheduler_log_lecturer
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE
);
