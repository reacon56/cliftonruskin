
-- Allow ingestion_run.data_source_id to be nullable (for standalone connector runs)
ALTER TABLE public.ingestion_run ALTER COLUMN data_source_id DROP NOT NULL;
