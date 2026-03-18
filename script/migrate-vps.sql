-- Safe schema migrations for VPS PostgreSQL
-- Run: psql $DATABASE_URL -f script/migrate-vps.sql
-- Each statement is idempotent (IF NOT EXISTS / IF EXISTS guards).

ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS show_phone boolean NOT NULL DEFAULT false;
