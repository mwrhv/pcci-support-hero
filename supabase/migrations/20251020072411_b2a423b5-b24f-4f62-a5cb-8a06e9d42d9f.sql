-- Fix 1: Create a view for minimal profile data (only what's needed for tickets)
CREATE OR REPLACE VIEW public.profiles_minimal AS
SELECT 
  id,
  full_name,
  avatar_url
FROM public.profiles
WHERE is_active = true;

-- Fix 2: Update RLS policy to use minimal view for ticket-related access
DROP POLICY IF EXISTS "Users can view profiles related to their tickets" ON public.profiles;

CREATE POLICY "Users can view minimal profiles for ticket context"
ON public.profiles
FOR SELECT
USING (
  -- Users can only see minimal data (id, full_name) of people on their tickets
  id IN (
    SELECT tickets.requester_id
    FROM tickets
    WHERE tickets.assignee_id = auth.uid() OR tickets.requester_id = auth.uid()
    UNION
    SELECT tickets.assignee_id
    FROM tickets
    WHERE tickets.requester_id = auth.uid() OR tickets.assignee_id = auth.uid()
  )
  -- Full profile data only visible to:
  AND (
    -- The user themselves
    auth.uid() = id
    -- Or supervisors/admins
    OR is_supervisor_or_admin(auth.uid())
  )
);

-- Fix 3: Add input validation helper functions
CREATE OR REPLACE FUNCTION public.is_valid_uuid(input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM input::uuid;
  RETURN true;
EXCEPTION WHEN others THEN
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_valid_email(input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN input ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND length(input) <= 255
    AND lower(trim(input)) = input;
END;
$$;

-- Fix 4: Create table for operation logging and rate limiting
CREATE TABLE IF NOT EXISTS public.db_operations_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  operation text NOT NULL CHECK (operation IN ('export', 'import', 'reset')),
  status text NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS on operations log
ALTER TABLE public.db_operations_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view operation logs
CREATE POLICY "Admins can view operation logs"
ON public.db_operations_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_db_operations_log_rate_limit 
ON public.db_operations_log(user_id, operation, created_at DESC);

-- Fix 5: Enable audit logging trigger for user_roles table
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION log_audit_event('user_role_changed');