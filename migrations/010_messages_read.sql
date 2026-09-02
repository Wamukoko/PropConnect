-- 010_messages_read.sql
-- Track when an inbound message has been read by an agent so the Messages
-- page can surface unread conversations.

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_messages_read
  ON messages (account_id, read_at)
  WHERE read_at IS NULL;