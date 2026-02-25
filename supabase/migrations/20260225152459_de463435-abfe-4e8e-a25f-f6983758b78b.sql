
CREATE TABLE public.review_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  reminder_type text NOT NULL,
  sent_date date NOT NULL DEFAULT CURRENT_DATE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  recipient_email text,
  UNIQUE (entity_id, reminder_type, sent_date)
);

ALTER TABLE public.review_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal manage reminders"
ON public.review_reminders FOR ALL
USING (is_internal(auth.uid()));

CREATE POLICY "Users see own org reminders"
ON public.review_reminders FOR SELECT
USING (org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid()));

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
