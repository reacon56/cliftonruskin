
-- Add feature_tier to organisations: 'A', 'B', 'C', or 'custom'
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS feature_tier text NOT NULL DEFAULT 'C';

-- Update existing org that has all features enabled to tier A
UPDATE public.organisations
SET feature_tier = 'A'
WHERE id IN (
  SELECT org_id FROM public.org_feature_flags
  WHERE feature_key = 'ownership_structure_intelligence' AND enabled = true
);
