-- Migration: 006_push_subscriptions.sql
-- Create push_subscriptions table for PWA Web Push notifications

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    officer_id VARCHAR(50) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,  -- Browser public key
    auth TEXT NOT NULL,    -- Authentication secret
    user_agent TEXT,       -- Browser user agent for diagnostics
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(officer_id, endpoint)  -- Multiple devices per officer permitted
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_officer_id
ON push_subscriptions(officer_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
ON push_subscriptions(endpoint);
