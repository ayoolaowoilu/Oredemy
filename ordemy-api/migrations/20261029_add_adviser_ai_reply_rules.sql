ALTER TABLE adviser_ai_groups
    ADD COLUMN reply_rule_id BIGINT NULL;

CREATE TABLE adviser_ai_reply_rules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    lecturer_id VARCHAR(36) NOT NULL,
    source_group_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    examples JSON NOT NULL,
    reply_text TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_adviser_ai_reply_rule_source (source_group_id),
    INDEX idx_adviser_ai_reply_rule_lecturer (lecturer_id, is_active),
    CONSTRAINT fk_adviser_ai_reply_rule_lecturer
        FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_adviser_ai_reply_rule_source_group
        FOREIGN KEY (source_group_id) REFERENCES adviser_ai_groups(id) ON DELETE CASCADE
);

ALTER TABLE adviser_ai_groups
    ADD CONSTRAINT fk_adviser_ai_group_reply_rule
        FOREIGN KEY (reply_rule_id)
        REFERENCES adviser_ai_reply_rules(id)
        ON DELETE SET NULL;
