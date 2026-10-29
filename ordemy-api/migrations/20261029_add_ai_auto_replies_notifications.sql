ALTER TABLE users
    ADD COLUMN ai_auto_replies BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE adviser_ai_groups
    ADD COLUMN auto_sent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE adviser_ai_notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    lecturer_id VARCHAR(36) NOT NULL,
    run_id BIGINT NOT NULL,
    message VARCHAR(500) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_adviser_ai_notifications_user (lecturer_id, is_read, created_at),
    UNIQUE KEY uq_adviser_ai_notification_run (run_id),
    CONSTRAINT fk_adviser_ai_notification_lecturer
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_adviser_ai_notification_run
        FOREIGN KEY (run_id) REFERENCES adviser_ai_runs(id) ON DELETE CASCADE
);
