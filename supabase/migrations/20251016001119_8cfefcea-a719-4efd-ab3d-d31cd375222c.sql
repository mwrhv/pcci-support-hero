-- Supprimer l'ancienne politique de lecture restrictive
DROP POLICY IF EXISTS "Users can view their tickets" ON public.tickets;

-- Créer une nouvelle politique permettant à tous les utilisateurs authentifiés de voir tous les tickets
CREATE POLICY "All authenticated users can view all tickets"
ON public.tickets
FOR SELECT
USING (auth.uid() IS NOT NULL);