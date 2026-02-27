
-- Work Orders table
CREATE TABLE public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  quote_id uuid REFERENCES public.quotes(id),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  assigned_officer uuid,
  delivery_status text NOT NULL DEFAULT 'not_started',
  delivery_date date,
  qa_required boolean NOT NULL DEFAULT false,
  invoice_status text NOT NULL DEFAULT 'not_invoiced',
  external_invoice_reference text,
  total_value numeric NOT NULL DEFAULT 0,
  partner_cost numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- Internal full access
CREATE POLICY "Internal manage work orders"
  ON public.work_orders FOR ALL
  TO authenticated
  USING (public.is_internal(auth.uid()))
  WITH CHECK (public.is_internal(auth.uid()));

-- Clients can view their own org work orders (limited fields handled in app)
CREATE POLICY "Clients view own org work orders"
  ON public.work_orders FOR SELECT
  TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()));
