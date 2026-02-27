
-- Add ingestion-specific columns to data_source
ALTER TABLE public.data_source
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'HTTP_DOWNLOAD',
  ADD COLUMN IF NOT EXISTS urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS expected_format text NOT NULL DEFAULT 'CSV',
  ADD COLUMN IF NOT EXISTS refresh_cadence text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_run_status text;
