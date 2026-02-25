ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS auto_suggest_benchmark boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_suggest_posture boolean NOT NULL DEFAULT true;