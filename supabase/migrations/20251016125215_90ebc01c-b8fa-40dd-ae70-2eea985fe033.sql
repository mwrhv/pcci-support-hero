-- S'assurer que les colonnes qui référencent les utilisateurs peuvent être NULL

-- 1. Vérifier et modifier tickets.requester_id si nécessaire
-- Note: requester_id devrait rester NOT NULL car chaque ticket doit avoir un demandeur initial
-- On ne modifie pas cette colonne

-- 2. Modifier ticket_updates.author_id pour permettre NULL
ALTER TABLE public.ticket_updates 
ALTER COLUMN author_id DROP NOT NULL;

-- 3. Modifier kb_articles.author_id pour permettre NULL
ALTER TABLE public.kb_articles 
ALTER COLUMN author_id DROP NOT NULL;

-- Commentaires
COMMENT ON COLUMN public.ticket_updates.author_id IS 
  'Author of the update. Can be NULL if the author account is deleted';

COMMENT ON COLUMN public.kb_articles.author_id IS 
  'Author of the article. Can be NULL if the author account is deleted';