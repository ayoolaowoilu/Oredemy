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
    event_type VARCHAR(40) NOT NULL,
    details VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_adviser_scheduler_log_created (created_at)
);
