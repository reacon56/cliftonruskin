
-- Tighten INSERT policy to only allow service-role (non-authenticated) inserts
DROP POLICY "Service role can insert impacts" ON public.jurisdiction_change_impact;
