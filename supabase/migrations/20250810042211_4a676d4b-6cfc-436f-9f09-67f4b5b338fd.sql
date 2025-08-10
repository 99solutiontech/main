-- Allow admins and super_admins to update any profile (approve/reject/suspend)
-- Safe to re-run
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (get_current_user_role() = ANY (ARRAY['admin','super_admin']))
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin','super_admin']));