-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all assets" ON public.assets;

-- Create a new restrictive policy for viewing assets
-- Only supervisors and admins can view the asset inventory
CREATE POLICY "Only supervisors and admins can view assets"
ON public.assets
FOR SELECT
TO authenticated
USING (is_supervisor_or_admin(auth.uid()));