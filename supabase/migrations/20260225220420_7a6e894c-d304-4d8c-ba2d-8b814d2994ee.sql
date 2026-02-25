CREATE POLICY "Client admin update own org"
ON public.organisations
FOR UPDATE
TO authenticated
USING (
  id = get_user_org_id(auth.uid())
  AND has_role(auth.uid(), 'client_admin'::app_role)
)
WITH CHECK (
  id = get_user_org_id(auth.uid())
  AND has_role(auth.uid(), 'client_admin'::app_role)
);