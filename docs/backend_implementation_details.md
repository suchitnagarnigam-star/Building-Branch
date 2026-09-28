# Demolition / Enforcement Action: Backend & Database Implementation Details

This document outlines the detailed backend and database implementation for the Demolition/Enforcement action form.

## 1. Database Schema Additions

A new migration file `004_create_demolition_tables.sql` has been created with the following schema:

```sql
-- Migration: 004_create_demolition_tables.sql
-- Create demolition tracking and evidence tables

CREATE TABLE IF NOT EXISTS demolition_records (
    demolition_id SERIAL PRIMARY KEY,
    case_id VARCHAR(100) REFERENCES cases(case_id),
    demolition_order_number VARCHAR(100),
    order_date TIMESTAMPTZ,
    delivery_date TIMESTAMPTZ,
    specified_period_days INT CHECK (specified_period_days >= 3),
    compliance_deadline TIMESTAMPTZ,
    order_reason TEXT,
    appeal_filed VARCHAR(10) DEFAULT 'no',
    appeal_number VARCHAR(100),
    appeal_date TIMESTAMPTZ,
    appeal_authority VARCHAR(150),
    stay_granted VARCHAR(10) DEFAULT 'no',
    stay_date TIMESTAMPTZ,
    compliance_status VARCHAR(50) DEFAULT 'pending',
    enforcement_outcome VARCHAR(50),
    compliance_date TIMESTAMPTZ,
    verification_date TIMESTAMPTZ,
    verification_status VARCHAR(50),
    action_date TIMESTAMPTZ,
    demolition_type VARCHAR(20),
    executed_by VARCHAR(150),
    demolished_portion TEXT,
    remaining_violation TEXT,
    next_action VARCHAR(150),
    expected_action_date TIMESTAMPTZ,
    remarks TEXT,
    cost_recovery_applicable VARCHAR(10) DEFAULT 'no',
    demolition_cost DECIMAL(12, 2),
    recovery_amount DECIMAL(12, 2),
    recovery_status VARCHAR(50),
    recovery_reference VARCHAR(150),
    created_by_id VARCHAR(50),
    created_by_name VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS demolition_evidence (
    evidence_id SERIAL PRIMARY KEY,
    demolition_id INT REFERENCES demolition_records(demolition_id) ON DELETE CASCADE,
    evidence_type VARCHAR(50), 
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    drive_file_id VARCHAR(255),
    drive_file_url TEXT,
    storage_provider VARCHAR(50) DEFAULT 'google_drive',
    uploaded_by_id VARCHAR(50),
    uploaded_by_name VARCHAR(150),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 2. Backend API Implementation (`server/routes/complaintRoutes.ts`)

The following REST endpoints will be added to support the enforcement workflow:

1. **`GET /api/cases/:caseId/demolition`**
   - Fetches the active `demolition_records` for the specified `case_id`.
   - Used to populate the initial state of the form.

2. **`POST /api/cases/:caseId/demolition-action`**
   - Receives FormData containing enforcement outcomes and evidence files.
   - **Validation:** 
     - Rejects execution if an active stay exists (`stay_granted == 'yes'`).
     - Validates mandatory fields based on the selected `outcome`.
   - **Business Logic:** 
     - Inserts or updates the `demolition_records` table.
     - Uploads the evidence file to Google Drive and saves metadata in `demolition_evidence`.
     - Inserts a transition into `case_status_history` indicating the enforcement action taken.
     - Case is allowed to close only if it's a full demolition or complete compliance.

## 3. Frontend Integration (`EnforcementActionForm.tsx`)

The UI mock data is replaced with:
- `useEffect` fetching `GET /api/cases/:id/demolition` to prepopulate the case data and existing enforcement outcome.
- `handleSubmit` converted to use `FormData`, posting to `POST /api/cases/:id/demolition-action`.
- Loading states and robust error handling to reflect backend validation failures (e.g., trying to submit action while under an active stay).
