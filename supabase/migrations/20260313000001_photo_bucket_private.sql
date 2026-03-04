-- ============================================================================
-- Make photos-compressed bucket private
--
-- Fleet photos (cargo, damage, inspections) are currently publicly accessible
-- to anyone with the URL. The app already uses getSignedUrl() for all photo
-- access, so switching to private has zero impact on functionality.
-- ============================================================================

UPDATE storage.buckets
SET public = FALSE
WHERE id = 'photos-compressed';
