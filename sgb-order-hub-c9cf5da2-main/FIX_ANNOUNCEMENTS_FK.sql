-- Fix: announcements.created_by FK violation
-- The constraint requires created_by to reference profiles table,
-- but admin user may not have a profile row.
-- Solution: make the FK deferrable OR drop it (created_by is just audit info)

-- Option 1 (recommended): Drop the FK constraint so created_by can be NULL
ALTER TABLE announcements
  DROP CONSTRAINT IF EXISTS announcements_created_by_fkey;

-- Option 2 (alternative): Make it nullable with no FK (already nullable, just remove constraint)
-- The column stays as UUID, just no longer enforced against profiles table.

-- Also fix staff_leaves if it has a similar issue
ALTER TABLE staff_leaves
  DROP CONSTRAINT IF EXISTS staff_leaves_created_by_fkey;
