-- Insert new specialized categories for forms
INSERT INTO public.categories (name, description) VALUES
  ('Retour Matériel', 'Fiches de retour de matériel informatique'),
  ('Départ Télétravail', 'Fiches de départ en télétravail'),
  ('Démission', 'Fiches de démission d''employés')
ON CONFLICT DO NOTHING;