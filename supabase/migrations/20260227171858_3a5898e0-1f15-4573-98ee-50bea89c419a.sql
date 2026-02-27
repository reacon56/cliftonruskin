
-- Jurisdiction alert subscriptions
CREATE TABLE public.jurisdiction_alert_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  jurisdiction_id UUID NOT NULL REFERENCES public.jurisdiction(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'both')),
  indicator_types TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, jurisdiction_id)
);

-- In-app notification store
CREATE TABLE public.jurisdiction_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  jurisdiction_id UUID NOT NULL REFERENCES public.jurisdiction(id) ON DELETE CASCADE,
  indicator_change_id UUID REFERENCES public.jurisdiction_indicator_change(id),
  title TEXT NOT NULL,
  body TEXT,
  indicator_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.jurisdiction_alert_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisdiction_alerts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users manage own subscriptions"
  ON public.jurisdiction_alert_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own alerts
CREATE POLICY "Users read own alerts"
  ON public.jurisdiction_alerts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update (mark read) their own alerts
CREATE POLICY "Users update own alerts"
  ON public.jurisdiction_alerts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Internal staff can insert alerts (via service role in edge functions)
-- No insert policy needed for users; alerts are created server-side
