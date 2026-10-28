ALTER TABLE adviser_ai_scheduler_logs
    ADD COLUMN lecturer_id VARCHAR(36) NULL AFTER id,
    ADD INDEX idx_adviser_scheduler_log_lecturer (lecturer_id, created_at),
    ADD CONSTRAINT fk_adviser_scheduler_log_lecturer
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE;
