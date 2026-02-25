
-- Partner tasks for in-country input requests (internal only)
CREATE TABLE public.partner_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_module_id uuid NOT NULL REFERENCES public.case_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  country text NOT NULL,
  deadline date,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'sent',
  response_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal manage partner tasks"
  ON public.partner_tasks FOR ALL TO authenticated
  USING (is_internal(auth.uid()));
