
-- Add timeline-ready columns to entity_relationships
ALTER TABLE public.entity_relationships
  ADD COLUMN IF NOT EXISTS effective_from_date DATE,
  ADD COLUMN IF NOT EXISTS effective_to_date DATE;
