-- Migration: 003_add_submitted_by.sql
-- Add submitted_by_user_id to complaints table to track complaint registration source

ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS submitted_by_user_id INT REFERENCES users(user_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_complaints_submitted_by ON complaints(submitted_by_user_id);
