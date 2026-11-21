-- Conversations and messages: a buyer asks the owner of a published property ("Enquire now") and they exchange
-- text messages. One conversation per buyer and property; the seller is the property's owner, copied here when the
-- conversation starts so it keeps working if ownership data changes. Read state is the id of the last message each
-- side has seen, so unread counts are exact and need no per-message flags.
-- Rollback: db/rollback/U202611221000__create_conversations_and_messages.sql

SET LOCAL lock_timeout = '5s';

CREATE TABLE conversations (
    id                          BIGSERIAL PRIMARY KEY,
    property_id                 BIGINT      NOT NULL REFERENCES property_projects (id) ON DELETE CASCADE,
    buyer_id                    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    seller_id                   BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- Orders both inboxes; moved by every message.
    last_message_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Highest message id each side has read; 0 = none.
    buyer_last_read_message_id  BIGINT      NOT NULL DEFAULT 0,
    seller_last_read_message_id BIGINT      NOT NULL DEFAULT 0,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One conversation per buyer and property; asking again reuses it.
    CONSTRAINT uq_conversations_property_buyer UNIQUE (property_id, buyer_id),
    CONSTRAINT chk_conversations_parties CHECK (buyer_id <> seller_id)
);

-- Each side's inbox, most recent conversation first; also serve the FK checks when a user is deleted.
CREATE INDEX idx_conversations_buyer_last_message ON conversations (buyer_id, last_message_at DESC, id DESC);
CREATE INDEX idx_conversations_seller_last_message ON conversations (seller_id, last_message_at DESC, id DESC);

CREATE TABLE messages (
    id              BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT        NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    sender_id       BIGINT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    body            VARCHAR(2000) NOT NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT chk_messages_body_not_blank CHECK (btrim(body) <> '')
);

-- A conversation's messages in order (pagination by id) and the latest one.
CREATE INDEX idx_messages_conversation_id ON messages (conversation_id, id);
-- The FK check when a user is deleted.
CREATE INDEX idx_messages_sender_id ON messages (sender_id);
