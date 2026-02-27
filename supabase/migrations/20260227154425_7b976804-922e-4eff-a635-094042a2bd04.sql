
-- Product catalogue
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  product_type text NOT NULL DEFAULT 'Report',
  description text NOT NULL DEFAULT '',
  internal_delivery_notes text,
  base_price numeric NOT NULL DEFAULT 0,
  pricing_unit text NOT NULL DEFAULT 'per report',
  sla_default_days integer,
  included_in_packages text[] NOT NULL DEFAULT '{}',
  vat_applicability text NOT NULL DEFAULT 'VATable',
  jurisdiction_pricing_modifier jsonb DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Internal staff full access
CREATE POLICY "Internal manage products"
  ON public.products FOR ALL TO authenticated
  USING (public.is_internal(auth.uid()))
  WITH CHECK (public.is_internal(auth.uid()));

-- Clients can see enabled products (name/price only enforced at app level)
CREATE POLICY "Clients read enabled products"
  ON public.products FOR SELECT TO authenticated
  USING (enabled = true);

-- Rate cards (versioned, per-org or global)
CREATE TABLE public.rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  org_id uuid REFERENCES public.organisations(id),
  client_group text,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  effective_from date,
  effective_to date,
  discount_pct numeric DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal manage rate cards"
  ON public.rate_cards FOR ALL TO authenticated
  USING (public.is_internal(auth.uid()))
  WITH CHECK (public.is_internal(auth.uid()));

CREATE POLICY "Clients read own rate cards"
  ON public.rate_cards FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()));

-- Rate card line items (per-product overrides)
CREATE TABLE public.rate_card_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_card_id uuid NOT NULL REFERENCES public.rate_cards(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  override_price numeric,
  override_sla_days integer,
  override_vat text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_card_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal manage rate card items"
  ON public.rate_card_items FOR ALL TO authenticated
  USING (public.is_internal(auth.uid()))
  WITH CHECK (public.is_internal(auth.uid()));

CREATE POLICY "Clients read own rate card items"
  ON public.rate_card_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rate_cards rc
    WHERE rc.id = rate_card_items.rate_card_id
      AND rc.org_id = public.get_user_org_id(auth.uid())
  ));
