-- Migration: 001_create_users_table.sql
-- Create users table for authentication and identity management

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    phone_number VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('superadmin', 'jc', 'mtp', 'atp', 'bi', 'operator')),
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    failed_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure officers table exists before linking foreign key
CREATE TABLE IF NOT EXISTS officers (
    officer_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20),
    designation VARCHAR(50),
    zone VARCHAR(50),
    blocks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link officers table with users
ALTER TABLE officers ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(user_id) ON DELETE SET NULL;

