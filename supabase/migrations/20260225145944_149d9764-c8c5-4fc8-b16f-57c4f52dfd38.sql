
-- Add address, geocoding, and PoC fields to entities table
ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS registered_address_line1 text,
  ADD COLUMN IF NOT EXISTS registered_address_line2 text,
  ADD COLUMN IF NOT EXISTS registered_city text,
  ADD COLUMN IF NOT EXISTS registered_region text,
  ADD COLUMN IF NOT EXISTS registered_postcode text,
  ADD COLUMN IF NOT EXISTS registered_country text,
  ADD COLUMN IF NOT EXISTS head_office_address_line1 text,
  ADD COLUMN IF NOT EXISTS head_office_address_line2 text,
  ADD COLUMN IF NOT EXISTS head_office_city text,
  ADD COLUMN IF NOT EXISTS head_office_region text,
  ADD COLUMN IF NOT EXISTS head_office_postcode text,
  ADD COLUMN IF NOT EXISTS head_office_country text,
  ADD COLUMN IF NOT EXISTS registered_lat numeric,
  ADD COLUMN IF NOT EXISTS registered_lng numeric,
  ADD COLUMN IF NOT EXISTS hq_lat numeric,
  ADD COLUMN IF NOT EXISTS hq_lng numeric,
  ADD COLUMN IF NOT EXISTS poc_name text,
  ADD COLUMN IF NOT EXISTS poc_email text,
  ADD COLUMN IF NOT EXISTS poc_phone text;
