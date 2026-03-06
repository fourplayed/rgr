-- ============================================================================
-- Fix photos-compressed storage RLS: restrict SELECT to authenticated users
--
-- The bucket was made private (public = FALSE) in 20260313000001, but the
-- SELECT policy still grants TO public, allowing unauthenticated access
-- via the Supabase Storage download API.
-- ============================================================================

DROP POLICY IF EXISTS "photos_compressed_select" ON storage.objects;

CREATE POLICY "photos_compressed_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'photos-compressed');
