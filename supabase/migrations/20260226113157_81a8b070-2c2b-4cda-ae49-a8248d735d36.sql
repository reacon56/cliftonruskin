
-- Drop the existing permissive insert policy that only checks performed_by
DROP POLICY IF EXISTS "Authenticated insert billing events" ON public.billing_events;

-- Replace with org-scoped insert policy
CREATE POLICY "Org-scoped insert billing events"
  ON public.billing_events FOR INSERT TO authenticated
  WITH CHECK (
    performed_by = auth.uid()
    AND (org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid()))
  );
