-- Migration: 007_create_notifications_table.sql
-- Create notifications table for in-app notification center and ensure url column exists

CREATE TABLE IF NOT EXISTS notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    recipient_officer_id VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'statutory_alert',
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    url TEXT DEFAULT '/',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure url column exists if notifications table pre-existed
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '/';

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_officer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);

