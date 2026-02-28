
-- Audience enum
CREATE TYPE public.methodology_audience AS ENUM ('CLIENT', 'INTERNAL');

-- Main document table
CREATE TABLE public.methodology_document (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  audience public.methodology_audience NOT NULL DEFAULT 'CLIENT',
  current_version_id UUID, -- will FK after methodology_version created
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Version table
CREATE TABLE public.methodology_version (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  methodology_document_id UUID NOT NULL REFERENCES public.methodology_document(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  content_markdown TEXT NOT NULL DEFAULT '',
  change_summary TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_by UUID,
  content_hash TEXT,
  UNIQUE (methodology_document_id, version)
);

-- Now add FK from document to version
ALTER TABLE public.methodology_document
  ADD CONSTRAINT methodology_document_current_version_fkey
  FOREIGN KEY (current_version_id) REFERENCES public.methodology_version(id);

-- RLS
ALTER TABLE public.methodology_document ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.methodology_version ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read CLIENT methodology docs
CREATE POLICY "Authenticated users can read CLIENT methodology docs"
  ON public.methodology_document FOR SELECT
  TO authenticated
  USING (audience = 'CLIENT' OR public.is_internal(auth.uid()));

-- Internal users can read all versions
CREATE POLICY "Internal users can read all methodology versions"
  ON public.methodology_version FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.methodology_document md
      WHERE md.id = methodology_document_id
        AND (md.audience = 'CLIENT' OR public.is_internal(auth.uid()))
    )
  );

-- Platform admins can manage documents
CREATE POLICY "Platform admins manage methodology_document"
  ON public.methodology_document FOR ALL
  USING (public.has_role(auth.uid(), 'fvc_ops_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'fvc_ops_admin'));

-- Platform admins can manage versions
CREATE POLICY "Platform admins manage methodology_version"
  ON public.methodology_version FOR ALL
  USING (public.has_role(auth.uid(), 'fvc_ops_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'fvc_ops_admin'));
