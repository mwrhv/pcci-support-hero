-- Add pcci_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN pcci_id TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_pcci_id ON public.profiles(pcci_id);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.pcci_id IS 'Identifiant PCCI de l''utilisateur';