-- Migration: 005_case_closures.sql
-- Create case_closures table and add review audit fields to violator_replies

CREATE TABLE IF NOT EXISTS case_closures (
    closure_id BIGSERIAL PRIMARY KEY,
    case_id VARCHAR(100) REFERENCES cases(case_id) ON DELETE CASCADE,
    closed_by_id VARCHAR(50) NOT NULL,
    closed_by_name VARCHAR(150) NOT NULL,
    closed_by_role VARCHAR(50) NOT NULL,
    closure_reason VARCHAR(100) NOT NULL,
    closing_description TEXT NOT NULL,
    evidence_file_name VARCHAR(255),
    evidence_drive_file_id VARCHAR(255),
    evidence_drive_file_url TEXT,
    closed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_closures_case_id ON case_closures(case_id);

-- Alter table to ensure all necessary columns exist on case_closures (idempotent if table already partially created)
ALTER TABLE case_closures
    ADD COLUMN IF NOT EXISTS closed_by_role VARCHAR(50),
    ADD COLUMN IF NOT EXISTS closure_reason VARCHAR(100);

-- Add reply review columns to violator_replies
ALTER TABLE violator_replies
    ADD COLUMN IF NOT EXISTS review_status VARCHAR(50) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS reviewed_by_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS reviewed_by_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS review_remarks TEXT;

CREATE INDEX IF NOT EXISTS idx_violator_replies_review_status ON violator_replies(review_status);
