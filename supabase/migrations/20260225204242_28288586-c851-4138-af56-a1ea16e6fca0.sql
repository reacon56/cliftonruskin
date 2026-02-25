
-- Update is_internal() to recognise all FV&C roles
CREATE OR REPLACE FUNCTION public.is_internal(_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN (
        'fvc_analyst',
        'fvc_ops_admin',
        'fvc_assurance_manager',
        'fvc_assurance_officer',
        'fvc_assurance_lead',
        'fvc_quality_reviewer'
      )
  )
$$;

-- Helper: can the user do QC sign-off?
CREATE OR REPLACE FUNCTION public.can_qc_signoff(_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('fvc_assurance_lead', 'fvc_quality_reviewer', 'fvc_ops_admin')
  )
$$;
