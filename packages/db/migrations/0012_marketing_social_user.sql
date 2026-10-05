-- 0012_marketing_social_user.sql — Metricool identifica al usuario con `userId` además del token.
ALTER TABLE gozz.mk_social_accounts ADD COLUMN IF NOT EXISTS external_user_id text;
