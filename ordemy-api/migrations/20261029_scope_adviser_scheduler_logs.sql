ALTER TABLE adviser_ai_scheduler_logs
    ADD COLUMN lecturer_id VARCHAR(36) NULL AFTER id,
    ADD INDEX idx_adviser_scheduler_log_lecturer (lecturer_id, created_at),
    ADD CONSTRAINT fk_adviser_scheduler_log_lecturer
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE;


ALTER TABLE chat_conversations
    MODIFY COLUMN type ENUM('support', 'lecturer', 'class') NOT NULL,
    MODIFY COLUMN student_id VARCHAR(36) NULL,
    ADD COLUMN class_department_id INT NULL,
    ADD COLUMN class_session VARCHAR(50) NULL,
    ADD UNIQUE KEY uq_chat_conversations_class (type, class_department_id, class_session),
    ADD CONSTRAINT fk_chat_conversations_class_department
        FOREIGN KEY (class_department_id) REFERENCES departments(id) ON DELETE CASCADE;