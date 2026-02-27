
-- Add last_refreshed_at to jurisdiction
ALTER TABLE public.jurisdiction ADD COLUMN IF NOT EXISTS last_refreshed_at timestamptz;

-- Add unique constraint on jurisdiction_indicator for upsert support
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jurisdiction_indicator_jurisdiction_id_indicator_type_key'
  ) THEN
    ALTER TABLE public.jurisdiction_indicator
      ADD CONSTRAINT jurisdiction_indicator_jurisdiction_id_indicator_type_key
      UNIQUE (jurisdiction_id, indicator_type);
  END IF;
END $$;
