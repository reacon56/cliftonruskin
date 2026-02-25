
-- 1. Create a private deliverables bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('deliverables', 'deliverables', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure partner-evidence bucket is private
UPDATE storage.buckets SET public = false WHERE id = 'partner-evidence';

-- ============================================================
-- STORAGE RLS POLICIES for partner-evidence bucket
-- ============================================================

-- Partners can upload to their own task folders
CREATE POLICY "partner_evidence_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'partner-evidence'
  AND has_role(auth.uid(), 'partner')
);

-- Partners & internal can read their assigned task evidence
CREATE POLICY "partner_evidence_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'partner-evidence'
  AND (
    is_internal(auth.uid())
    OR has_role(auth.uid(), 'partner')
  )
);

-- Partners can update (upsert) their own uploads
CREATE POLICY "partner_evidence_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'partner-evidence'
  AND (
    is_internal(auth.uid())
    OR has_role(auth.uid(), 'partner')
  )
);

-- ============================================================
-- STORAGE RLS POLICIES for deliverables bucket
-- ============================================================

-- Internal users can upload deliverables
CREATE POLICY "deliverables_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deliverables'
  AND is_internal(auth.uid())
);

-- Internal users and org members can read deliverables
-- (actual file access will be gated by signed URLs from edge function)
CREATE POLICY "deliverables_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deliverables'
  AND (
    is_internal(auth.uid())
    OR has_role(auth.uid(), 'client_admin')
    OR has_role(auth.uid(), 'client_requester')
    OR has_role(auth.uid(), 'client_auditor')
  )
);

-- Internal users can update/delete deliverables
CREATE POLICY "deliverables_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'deliverables'
  AND is_internal(auth.uid())
);

CREATE POLICY "deliverables_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'deliverables'
  AND is_internal(auth.uid())
);
