-- Migration: 008_complaint_assignment_ack.sql
-- Add assignment acknowledgement tracking to complaints and optimize notification entity lookups

ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS assignment_acknowledged_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acknowledged_by_officer_id VARCHAR(50) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_complaints_assigned_officer ON complaints(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_assignment_ack ON complaints(assignment_acknowledged_at);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_officer_id, read_at);
