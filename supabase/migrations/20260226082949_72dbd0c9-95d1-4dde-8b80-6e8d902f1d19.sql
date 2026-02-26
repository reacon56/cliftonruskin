ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS incorporation_country_code text,
  ADD COLUMN IF NOT EXISTS incorporation_country_name text,
  ADD COLUMN IF NOT EXISTS hq_country_code text,
  ADD COLUMN IF NOT EXISTS hq_country_name text;