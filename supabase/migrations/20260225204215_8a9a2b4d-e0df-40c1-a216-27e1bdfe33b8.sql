
-- Step 1: Add new FV&C roles to the app_role enum only
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fvc_assurance_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fvc_assurance_officer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fvc_assurance_lead';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fvc_quality_reviewer';
