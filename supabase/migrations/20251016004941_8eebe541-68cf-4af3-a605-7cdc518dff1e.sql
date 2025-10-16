-- Drop the existing policy
DROP POLICY IF EXISTS "Assigned agents can update their tickets" ON tickets;

-- Create a new policy that allows:
-- 1. Assigned agents to update their tickets
-- 2. Supervisors/admins to update any ticket
-- 3. Any authenticated user to assign themselves to an unassigned ticket (take charge)
CREATE POLICY "Agents can update tickets they're assigned to or take charge of unassigned tickets"
ON tickets
FOR UPDATE
USING (
  (auth.uid() = assignee_id) OR 
  is_supervisor_or_admin(auth.uid()) OR
  (assignee_id IS NULL AND auth.uid() IS NOT NULL)
)
WITH CHECK (
  (auth.uid() = assignee_id) OR 
  is_supervisor_or_admin(auth.uid()) OR
  (assignee_id IS NULL AND auth.uid() IS NOT NULL)
);