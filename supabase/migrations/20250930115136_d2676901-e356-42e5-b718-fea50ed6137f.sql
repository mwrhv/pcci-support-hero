-- Add metadata column to tickets table for custom form fields
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Insert the new categories
INSERT INTO public.categories (name, description) 
VALUES 
  ('Fiche Retour Matériel', 'Formulaire pour le retour de matériel informatique'),
  ('Fiche Départ Télétravail', 'Formulaire pour le départ en télétravail')
ON CONFLICT DO NOTHING;