
-- Case Tasks table for investigation workflow
CREATE TABLE public.case_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  owner_id uuid,
  due_date date,
  dependencies uuid[] DEFAULT '{}',
  attachments jsonb DEFAULT '[]'::jsonb,
  linked_retrieval_logs uuid[] DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.case_tasks ENABLE ROW LEVEL SECURITY;

-- Internal users can read all tasks
CREATE POLICY "Internal read case tasks"
  ON public.case_tasks FOR SELECT
  USING (is_internal(auth.uid()));

-- Internal users can create tasks
CREATE POLICY "Internal insert case tasks"
  ON public.case_tasks FOR INSERT
  WITH CHECK (is_internal(auth.uid()));

-- Internal users can update tasks
CREATE POLICY "Internal update case tasks"
  ON public.case_tasks FOR UPDATE
  USING (is_internal(auth.uid()));

-- Managers can delete tasks
CREATE POLICY "Manager delete case tasks"
  ON public.case_tasks FOR DELETE
  USING (
    has_role(auth.uid(), 'fvc_assurance_manager'::app_role)
    OR has_role(auth.uid(), 'fvc_ops_admin'::app_role)
  );

-- Case evidence locker bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('case-evidence', 'case-evidence', false);

-- RLS for case-evidence bucket
CREATE POLICY "Internal upload case evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'case-evidence' AND is_internal(auth.uid()));

CREATE POLICY "Internal read case evidence"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'case-evidence' AND is_internal(auth.uid()));

CREATE POLICY "Internal delete case evidence"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'case-evidence' AND is_internal(auth.uid()));
