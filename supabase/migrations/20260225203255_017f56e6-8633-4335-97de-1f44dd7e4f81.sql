
-- 1. Add 'partner' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';

-- 2. Add partner_user_id to partner_tasks so tasks can be assigned to a specific partner user
ALTER TABLE public.partner_tasks
  ADD COLUMN IF NOT EXISTS partner_user_id uuid,
  ADD COLUMN IF NOT EXISTS method_statement text;

-- 3. Update partner_tasks statuses: sent, accepted, in_progress, submitted, clarification_requested, completed
-- (status column already exists as text, no constraint to change)

-- 4. Create partner_task_items table (checklist items with evidence)
CREATE TABLE public.partner_task_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.partner_tasks(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  description text,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  completed_by uuid,
  file_url text,
  file_name text,
  geo_lat numeric,
  geo_lng numeric,
  geo_label text,
  notes text,
  is_client_shareable boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_task_items ENABLE ROW LEVEL SECURITY;

-- 5. Create partner_task_clarifications table
CREATE TABLE public.partner_task_clarifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.partner_tasks(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.partner_task_items(id) ON DELETE SET NULL,
  message text NOT NULL,
  sender_role text NOT NULL DEFAULT 'analyst',
  sender_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_task_clarifications ENABLE ROW LEVEL SECURITY;

-- 6. Storage bucket for partner evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-evidence', 'partner-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- 7. RLS: Partners see only their own tasks
CREATE POLICY "Partners see own tasks"
  ON public.partner_tasks FOR SELECT
  USING (partner_user_id = auth.uid() OR is_internal(auth.uid()));

CREATE POLICY "Partners update own tasks"
  ON public.partner_tasks FOR UPDATE
  USING (partner_user_id = auth.uid() OR is_internal(auth.uid()));

-- 8. RLS: Partner task items — partner sees items for their tasks only
CREATE POLICY "Partners see own task items"
  ON public.partner_task_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partner_tasks pt
      WHERE pt.id = partner_task_items.task_id
      AND (pt.partner_user_id = auth.uid() OR is_internal(auth.uid()))
    )
  );

CREATE POLICY "Partners manage own task items"
  ON public.partner_task_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM partner_tasks pt
      WHERE pt.id = partner_task_items.task_id
      AND (pt.partner_user_id = auth.uid() OR is_internal(auth.uid()))
    )
  );

-- 9. RLS: Clarifications — same scoping
CREATE POLICY "Users see task clarifications"
  ON public.partner_task_clarifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partner_tasks pt
      WHERE pt.id = partner_task_clarifications.task_id
      AND (pt.partner_user_id = auth.uid() OR is_internal(auth.uid()))
    )
  );

CREATE POLICY "Users insert task clarifications"
  ON public.partner_task_clarifications FOR INSERT
  WITH CHECK (
    sender_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM partner_tasks pt
      WHERE pt.id = partner_task_clarifications.task_id
      AND (pt.partner_user_id = auth.uid() OR is_internal(auth.uid()))
    )
  );

-- 10. Storage RLS for partner-evidence bucket
CREATE POLICY "Partners upload evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'partner-evidence' AND auth.uid() IS NOT NULL);

CREATE POLICY "Partners read evidence"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'partner-evidence' AND auth.uid() IS NOT NULL);
