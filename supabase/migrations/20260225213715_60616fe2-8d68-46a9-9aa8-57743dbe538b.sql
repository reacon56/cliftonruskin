
-- Add allow_pre_approval_start setting to organisations (default off)
ALTER TABLE public.organisations
  ADD COLUMN allow_pre_approval_start boolean NOT NULL DEFAULT false;
