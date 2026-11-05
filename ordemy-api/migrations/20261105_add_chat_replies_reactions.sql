ALTER TABLE chat_messages
    ADD COLUMN reply_to_message_id BIGINT NULL AFTER query_id,
    ADD INDEX idx_chat_messages_reply_to (reply_to_message_id),
    ADD INDEX idx_chat_messages_unread (conversation_id, id, sender_id),
    ADD CONSTRAINT fk_chat_messages_reply_to
        FOREIGN KEY (reply_to_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL;

CREATE TABLE chat_message_reactions (
    message_id BIGINT NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    emoji VARCHAR(16) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id),
    INDEX idx_chat_message_reactions_message (message_id),
    CONSTRAINT fk_chat_message_reaction_message
        FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_message_reaction_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
