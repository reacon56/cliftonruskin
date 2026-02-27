
-- Add channel column to case_messages for internal/client thread separation
ALTER TABLE public.case_messages ADD COLUMN channel text NOT NULL DEFAULT 'internal';

-- Drop existing RLS policies on case_messages
DROP POLICY IF EXISTS "Users see case messages" ON public.case_messages;
DROP POLICY IF EXISTS "Users send case messages" ON public.case_messages;

-- Internal users can see all messages (both channels)
CREATE POLICY "Internal see all case messages"
ON public.case_messages FOR SELECT TO authenticated
USING (
  is_internal(auth.uid()) AND EXISTS (
    SELECT 1 FROM cases c WHERE c.id = case_messages.case_id
  )
);

-- Client users can ONLY see client-channel messages for their org
CREATE POLICY "Clients see client channel only"
ON public.case_messages FOR SELECT TO authenticated
USING (
  channel = 'client'
  AND NOT is_internal(auth.uid())
  AND EXISTS (
    SELECT 1 FROM cases c
    WHERE c.id = case_messages.case_id
      AND c.org_id = get_user_org_id(auth.uid())
  )
);

-- Internal users can insert messages to any channel
CREATE POLICY "Internal send messages"
ON public.case_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_user_id = auth.uid()
  AND is_internal(auth.uid())
);

-- Client users can only insert into client channel
CREATE POLICY "Clients send client messages"
ON public.case_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_user_id = auth.uid()
  AND channel = 'client'
  AND NOT is_internal(auth.uid())
  AND EXISTS (
    SELECT 1 FROM cases c
    WHERE c.id = case_messages.case_id
      AND c.org_id = get_user_org_id(auth.uid())
  )
);

-- All Stations Notices table
CREATE TABLE public.all_stations_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  sender_user_id uuid NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.all_stations_notices ENABLE ROW LEVEL SECURITY;

-- Only managers can create notices
CREATE POLICY "Managers create notices"
ON public.all_stations_notices FOR INSERT TO authenticated
WITH CHECK (
  sender_user_id = auth.uid()
  AND (has_role(auth.uid(), 'fvc_assurance_manager') OR has_role(auth.uid(), 'fvc_ops_admin'))
);

-- Clients see notices for their org cases
CREATE POLICY "Clients see notices"
ON public.all_stations_notices FOR SELECT TO authenticated
USING (
  org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid())
);

-- Internal see all notices
CREATE POLICY "Internal see notices"
ON public.all_stations_notices FOR SELECT TO authenticated
USING (is_internal(auth.uid()));
