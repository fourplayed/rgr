-- ============================================================================
-- M1: Add WITH CHECK to profiles_update_superuser
-- M2: Add UPDATE policy on photos table
-- L3: Drop column-level UNIQUE on asset_number (partial index handles it)
-- ============================================================================

-- L3: The column-level UNIQUE constraint blocks soft-deleted asset number reuse.
-- The partial unique index (idx_assets_unique_asset_number) from migration
-- 20260218000003 is the correct constraint — only enforces uniqueness on
-- non-deleted rows. Drop the overly strict column-level constraint.
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_asset_number_key;

-- M1: Drop and recreate with WITH CHECK clause
DROP POLICY IF EXISTS "profiles_update_superuser" ON profiles;

CREATE POLICY "profiles_update_superuser"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth_user_role() = 'superuser')
    WITH CHECK (auth_user_role() = 'superuser');

-- M2: Allow photo owners and managers to update photos (e.g. mark as analyzed)
CREATE POLICY "photos_update_own_or_manager"
    ON photos FOR UPDATE
    TO authenticated
    USING (
        uploaded_by = auth.uid()
        OR is_manager_or_above()
    )
    WITH CHECK (
        uploaded_by = auth.uid()
        OR is_manager_or_above()
    );

-- Service role UPDATE for edge functions (analysis pipeline)
CREATE POLICY "photos_update_service"
    ON photos FOR UPDATE
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);
