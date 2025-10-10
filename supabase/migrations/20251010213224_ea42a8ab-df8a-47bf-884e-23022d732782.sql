-- Add gender column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('Masculin', 'Féminin', 'Autre', NULL));