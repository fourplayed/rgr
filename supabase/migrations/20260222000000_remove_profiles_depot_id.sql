-- Migration: Remove depot_id from profiles table
-- The free-text 'depot' column is sufficient; depot_id FK is unused and conflicts with existing logic.

ALTER TABLE profiles DROP COLUMN IF EXISTS depot_id;
