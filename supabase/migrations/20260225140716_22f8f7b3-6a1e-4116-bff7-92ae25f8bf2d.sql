
ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS onboarded_date date,
  ADD COLUMN IF NOT EXISTS business_unit text,
  ADD COLUMN IF NOT EXISTS service_provided text,
  ADD COLUMN IF NOT EXISTS criticality text NOT NULL DEFAULT 'med',
  ADD COLUMN IF NOT EXISTS internal_contacts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contract_renewal_date date;
