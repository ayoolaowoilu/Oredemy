CREATE TABLE adviser_ai_group_alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    lecturer_id VARCHAR(36) NOT NULL,
    run_id BIGINT NOT NULL,
    alert_date DATE NOT NULL,
    category ENUM('Results', 'Facilities', 'Timetable', 'Other') NOT NULL,
    question_count INT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    emailed_at TIMESTAMP NULL,
    UNIQUE KEY uq_adviser_ai_group_alert_category (lecturer_id, alert_date, category),
    INDEX idx_adviser_ai_group_alert_lecturer (lecturer_id, is_read, created_at),
    CONSTRAINT fk_adviser_ai_group_alert_lecturer
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_adviser_ai_group_alert_run
        FOREIGN KEY (run_id) REFERENCES adviser_ai_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_role_department_session
    ON users (role, department_id, session);

CREATE INDEX idx_queries_session_created_user
    ON queries (session, created_at, user_id);

CREATE INDEX idx_chat_conversations_class_cohort
    ON chat_conversations (type, class_department_id, class_session);
