-- Safe schema migrations for VPS PostgreSQL
-- Run: psql $DATABASE_URL -f script/migrate-vps.sql
-- Each statement is idempotent (IF NOT EXISTS / IF EXISTS guards).

ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS show_phone boolean NOT NULL DEFAULT false;

-- Make leads.video_id and leads.creator_user_id nullable
-- (allows GeeZee-card inquiries that aren't tied to a specific video)
ALTER TABLE leads ALTER COLUMN video_id DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN creator_user_id DROP NOT NULL;

-- GZFlash Ad Center table (GZBusiness tier feature)
CREATE TABLE IF NOT EXISTS gz_flash_ads (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  artwork_url text,
  retail_price_cents integer NOT NULL,
  discount_percent integer NOT NULL,
  quantity integer NOT NULL DEFAULT 10,
  claimed_count integer NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL,
  potency_score real NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE gz_flash_ads ADD COLUMN IF NOT EXISTS admin_note text;
ALTER TABLE gz_flash_ads ADD COLUMN IF NOT EXISTS display_mode text NOT NULL DEFAULT 'countdown';
