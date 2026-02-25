
-- ============================================
-- Far View & Chase — Assurance Portal Schema
-- ============================================

-- Role enum
CREATE TYPE public.app_role AS ENUM ('client_admin', 'client_requester', 'client_auditor', 'fvc_analyst', 'fvc_ops_admin');

-- Organisations
CREATE TABLE public.organisations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  risk_policy_default_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- Profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles (separate table for RBAC)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's org_id
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Function to check if user is internal (analyst or ops)
CREATE OR REPLACE FUNCTION public.is_internal(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role IN ('fvc_analyst', 'fvc_ops_admin')
  )
$$;

-- Entities (third parties)
CREATE TABLE public.entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'supplier' CHECK (entity_type IN ('supplier', 'partner', 'target')),
  country TEXT,
  website TEXT,
  registration_number TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  risk_tier TEXT NOT NULL DEFAULT 'B' CHECK (risk_tier IN ('A', 'B', 'C')),
  owner_user_id UUID REFERENCES auth.users(id),
  next_review_date DATE,
  last_review_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_entities_org_id ON public.entities(org_id);

-- Policies (review cycle policies)
CREATE TABLE public.policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

-- Now add FK from organisations to policies
ALTER TABLE public.organisations 
  ADD CONSTRAINT fk_risk_policy_default 
  FOREIGN KEY (risk_policy_default_id) REFERENCES public.policies(id) ON DELETE SET NULL;

-- Policy rules
CREATE TABLE public.policy_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  risk_tier TEXT NOT NULL CHECK (risk_tier IN ('A', 'B', 'C')),
  review_frequency_months INTEGER NOT NULL DEFAULT 12,
  monitoring_level TEXT NOT NULL DEFAULT 'low' CHECK (monitoring_level IN ('low', 'med', 'high')),
  default_product TEXT NOT NULL DEFAULT 'Assurance Note' CHECK (default_product IN ('Assurance Note', 'Assurance Dossier')),
  approval_required BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(policy_id, risk_tier)
);
ALTER TABLE public.policy_rules ENABLE ROW LEVEL SECURITY;

-- Cases (commissions)
CREATE TABLE public.cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'in_progress', 'awaiting_client', 'complete', 'cancelled')),
  product_type TEXT NOT NULL DEFAULT 'Assurance Note' CHECK (product_type IN ('Assurance Note', 'Assurance Dossier', 'Refresh Note')),
  priority TEXT NOT NULL DEFAULT 'standard' CHECK (priority IN ('standard', 'rush')),
  scope_notes TEXT,
  due_date DATE,
  sla_days INTEGER,
  price_estimate NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cases_org_id ON public.cases(org_id);
CREATE INDEX idx_cases_entity_id ON public.cases(entity_id);

-- Case messages
CREATE TABLE public.case_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.case_messages ENABLE ROW LEVEL SECURITY;

-- Deliverables
CREATE TABLE public.deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL CHECK (deliverable_type IN ('report', 'evidence_pack', 'change_log')),
  title TEXT NOT NULL,
  file_url TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

-- Change logs
CREATE TABLE public.change_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  what_changed TEXT,
  why_it_matters TEXT,
  recommended_action TEXT,
  confidence_level TEXT NOT NULL DEFAULT 'med' CHECK (confidence_level IN ('low', 'med', 'high')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.change_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_change_logs_entity_id ON public.change_logs(entity_id);

-- Monitoring events
CREATE TABLE public.monitoring_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('adverse_media', 'sanctions', 'corp_change', 'litigation', 'other')),
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'med', 'high')),
  headline TEXT NOT NULL,
  source_url TEXT,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'noted', 'actioned'))
);
ALTER TABLE public.monitoring_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_monitoring_events_entity_id ON public.monitoring_events(entity_id);

-- Audit events
CREATE TABLE public.audit_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_events_org_id ON public.audit_events(org_id);

-- ============================================
-- RLS Policies
-- ============================================

-- Organisations: users see their own org, internal sees all
CREATE POLICY "Users see own org" ON public.organisations
  FOR SELECT TO authenticated
  USING (id = public.get_user_org_id(auth.uid()) OR public.is_internal(auth.uid()));

CREATE POLICY "Internal can manage orgs" ON public.organisations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'fvc_ops_admin'));

-- Profiles: users see own, internal sees all
CREATE POLICY "Users see own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR org_id = public.get_user_org_id(auth.uid()) OR public.is_internal(auth.uid()));

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User roles: users see own roles, internal sees all
CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_internal(auth.uid()));

CREATE POLICY "Ops admin manages roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'fvc_ops_admin'));

-- Entities: scoped by org_id
CREATE POLICY "Users see own org entities" ON public.entities
  FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()) OR public.is_internal(auth.uid()));

CREATE POLICY "Client admin/requester manage entities" ON public.entities
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.get_user_org_id(auth.uid()) AND 
    (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_requester'))
  );

CREATE POLICY "Client admin update entities" ON public.entities
  FOR UPDATE TO authenticated
  USING (
    (org_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'client_admin'))
    OR public.is_internal(auth.uid())
  );

-- Policies: scoped by org
CREATE POLICY "Users see own org policies" ON public.policies
  FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()) OR public.is_internal(auth.uid()));

CREATE POLICY "Client admin manage policies" ON public.policies
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'client_admin'));

-- Policy rules: through policy org scoping
CREATE POLICY "Users see policy rules" ON public.policy_rules
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.policies p 
    WHERE p.id = policy_id 
    AND (p.org_id = public.get_user_org_id(auth.uid()) OR public.is_internal(auth.uid()))
  ));

CREATE POLICY "Client admin manage policy rules" ON public.policy_rules
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.policies p 
    WHERE p.id = policy_id AND p.org_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'client_admin')
  ));

-- Cases: scoped by org
CREATE POLICY "Users see own org cases" ON public.cases
  FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()) OR public.is_internal(auth.uid()));

CREATE POLICY "Client create cases" ON public.cases
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.get_user_org_id(auth.uid()) AND 
    (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_requester'))
  );

CREATE POLICY "Update cases" ON public.cases
  FOR UPDATE TO authenticated
  USING (
    (org_id = public.get_user_org_id(auth.uid()) AND 
     (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_requester')))
    OR public.is_internal(auth.uid())
  );

-- Case messages
CREATE POLICY "Users see case messages" ON public.case_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cases c 
    WHERE c.id = case_id 
    AND (c.org_id = public.get_user_org_id(auth.uid()) OR public.is_internal(auth.uid()))
  ));

CREATE POLICY "Users send case messages" ON public.case_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_user_id = auth.uid());

-- Deliverables
CREATE POLICY "Users see deliverables" ON public.deliverables
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cases c 
    WHERE c.id = case_id 
    AND (c.org_id = public.get_user_org_id(auth.uid()) OR public.is_internal(auth.uid()))
  ));

CREATE POLICY "Internal manage deliverables" ON public.deliverables
  FOR ALL TO authenticated
  USING (public.is_internal(auth.uid()));

-- Change logs
CREATE POLICY "Users see change logs" ON public.change_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.entities e 
    WHERE e.id = entity_id 
    AND (e.org_id = public.get_user_org_id(auth.uid()) OR public.is_internal(auth.uid()))
  ));

CREATE POLICY "Internal manage change logs" ON public.change_logs
  FOR ALL TO authenticated
  USING (public.is_internal(auth.uid()));

-- Monitoring events
CREATE POLICY "Users see monitoring events" ON public.monitoring_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.entities e 
    WHERE e.id = entity_id 
    AND (e.org_id = public.get_user_org_id(auth.uid()) OR public.is_internal(auth.uid()))
  ));

CREATE POLICY "Internal manage monitoring events" ON public.monitoring_events
  FOR ALL TO authenticated
  USING (public.is_internal(auth.uid()));

-- Audit events: scoped by org
CREATE POLICY "Users see own org audit events" ON public.audit_events
  FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id(auth.uid()) OR public.is_internal(auth.uid()));

CREATE POLICY "Authenticated insert audit events" ON public.audit_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
