-- Drop the overly permissive policy that allows all users to view all profiles
DROP POLICY IF EXISTS "Users can view all active profiles" ON public.profiles;

-- Allow users to view their own complete profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow supervisors to view all profiles (needed for ticket assignment and management)
CREATE POLICY "Supervisors can view all profiles"
ON public.profiles
FOR SELECT
USING (is_supervisor_or_admin(auth.uid()));

-- Allow users to view profiles of people involved in their tickets (requester or assignee)
CREATE POLICY "Users can view profiles related to their tickets"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT requester_id FROM public.tickets WHERE requester_id = auth.uid() OR assignee_id = auth.uid()
    UNION
    SELECT assignee_id FROM public.tickets WHERE requester_id = auth.uid() OR assignee_id = auth.uid()
  )
);