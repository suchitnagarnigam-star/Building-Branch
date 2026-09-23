-- Migration: 002_seed_users.sql
-- Note: Dynamic bcrypt hashing is performed via seedUsers.ts
-- Run: npm run seed:users (or npx tsx migrations/seedUsers.ts)

-- Template of records seeded by seedUsers.ts:
-- 1. Super Admin (username='admin', role='superadmin')
-- 2. Desk Operator (username='operator1', role='operator')
-- 3. Officers from server/data/officers.json:
--    - phone_number = officer's normalized mobile
--    - password_hash = bcrypt(last 6 digits of normalized mobile)
--    - role = mapped designation ('bi', 'atp', 'mtp', 'jc')
--    - name = officer's name
--    - officers.user_id linked to users.user_id

