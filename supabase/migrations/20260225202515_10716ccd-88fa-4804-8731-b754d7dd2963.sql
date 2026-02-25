
-- Quotes table: formal quote object for a case
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  total_price numeric NOT NULL DEFAULT 0,
  scope_notes text,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Clients see quotes for their org's cases
CREATE POLICY "Users see own org quotes" ON public.quotes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM cases c
    WHERE c.id = quotes.case_id
    AND (c.org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid()))
  )
);

-- Internal users manage quotes
CREATE POLICY "Internal manage quotes" ON public.quotes
FOR ALL USING (is_internal(auth.uid()));

-- Client admins can update quote status (approve/reject)
CREATE POLICY "Client admin update quotes" ON public.quotes
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM cases c
    WHERE c.id = quotes.case_id
    AND c.org_id = get_user_org_id(auth.uid())
    AND has_role(auth.uid(), 'client_admin')
  )
);

-- Auto-approval rules table
CREATE TABLE public.auto_approval_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  auto_approve_refresh_up_to numeric DEFAULT NULL,
  always_require_tier_a boolean NOT NULL DEFAULT true,
  always_require_rush boolean NOT NULL DEFAULT true,
  always_require_dossier boolean NOT NULL DEFAULT true,
  always_require_dp_high boolean NOT NULL DEFAULT true,
  always_require_partner_spend boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

ALTER TABLE public.auto_approval_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org rules" ON public.auto_approval_rules
FOR SELECT USING (
  org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid())
);

CREATE POLICY "Client admin manage rules" ON public.auto_approval_rules
FOR ALL USING (
  org_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'client_admin')
);

CREATE POLICY "Internal manage rules" ON public.auto_approval_rules
FOR ALL USING (is_internal(auth.uid()));
