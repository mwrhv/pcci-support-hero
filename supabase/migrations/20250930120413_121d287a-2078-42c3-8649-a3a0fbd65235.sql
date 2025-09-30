-- Supprimer les catégories "Fiche Retour Matériel" et "Fiche Départ Télétravail"
DELETE FROM public.categories 
WHERE name IN ('Fiche Retour Matériel', 'Fiche Départ Télétravail');