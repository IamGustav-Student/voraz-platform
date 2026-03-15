
-- Phase 25: Fix points_history check constraint
-- Add 'refund' to the allowed types

-- We need to drop the check constraint and recreate it
ALTER TABLE points_history DROP CONSTRAINT IF EXISTS points_history_type_check;

ALTER TABLE points_history ADD CONSTRAINT points_history_type_check 
CHECK (type IN ('earned', 'redeemed', 'expired', 'bonus', 'refund'));
