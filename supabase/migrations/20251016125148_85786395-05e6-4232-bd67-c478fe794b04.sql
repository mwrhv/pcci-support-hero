-- Corriger les contraintes RESTRICT qui empêchent la suppression d'utilisateurs

-- 1. tickets.requester_id : changer RESTRICT en SET NULL
ALTER TABLE public.tickets 
DROP CONSTRAINT IF EXISTS tickets_requester_id_fkey;

ALTER TABLE public.tickets 
ADD CONSTRAINT tickets_requester_id_fkey 
FOREIGN KEY (requester_id) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- 2. ticket_updates.author_id : changer RESTRICT en SET NULL
ALTER TABLE public.ticket_updates 
DROP CONSTRAINT IF EXISTS ticket_updates_author_id_fkey;

ALTER TABLE public.ticket_updates 
ADD CONSTRAINT ticket_updates_author_id_fkey 
FOREIGN KEY (author_id) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- 3. kb_articles.author_id : changer RESTRICT en SET NULL
ALTER TABLE public.kb_articles 
DROP CONSTRAINT IF EXISTS kb_articles_author_id_fkey;

ALTER TABLE public.kb_articles 
ADD CONSTRAINT kb_articles_author_id_fkey 
FOREIGN KEY (author_id) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- Commentaires pour la documentation
COMMENT ON CONSTRAINT tickets_requester_id_fkey ON public.tickets IS 
  'SET NULL on delete to preserve ticket history even if requester is deleted';

COMMENT ON CONSTRAINT ticket_updates_author_id_fkey ON public.ticket_updates IS 
  'SET NULL on delete to preserve update history even if author is deleted';

COMMENT ON CONSTRAINT kb_articles_author_id_fkey ON public.kb_articles IS 
  'SET NULL on delete to preserve articles even if author is deleted';