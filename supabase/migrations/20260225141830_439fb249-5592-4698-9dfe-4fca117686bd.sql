ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS approval_price_threshold numeric DEFAULT NULL;