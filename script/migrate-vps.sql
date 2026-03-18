-- Safe schema migrations for VPS PostgreSQL
-- Run: psql $DATABASE_URL -f script/migrate-vps.sql
-- Each statement is idempotent (IF NOT EXISTS / IF EXISTS guards).

ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS show_phone boolean NOT NULL DEFAULT false;

-- Make leads.video_id and leads.creator_user_id nullable
-- (allows GeeZee-card inquiries that aren't tied to a specific video)
ALTER TABLE leads ALTER COLUMN video_id DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN creator_user_id DROP NOT NULL;
