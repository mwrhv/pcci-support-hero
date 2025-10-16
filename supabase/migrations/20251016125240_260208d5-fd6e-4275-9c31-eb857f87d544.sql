-- Permettre à tickets.requester_id d'être NULL pour éviter les erreurs lors de la suppression
-- Cela permet de préserver l'historique des tickets même si le demandeur est supprimé

ALTER TABLE public.tickets 
ALTER COLUMN requester_id DROP NOT NULL;

COMMENT ON COLUMN public.tickets.requester_id IS 
  'Initial requester of the ticket. Can be NULL if the requester account is deleted';