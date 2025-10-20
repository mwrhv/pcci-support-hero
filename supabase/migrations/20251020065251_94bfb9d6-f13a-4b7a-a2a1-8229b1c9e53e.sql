-- Créer les politiques RLS pour le bucket avatars
-- Permettre aux utilisateurs de voir leurs propres avatars
CREATE POLICY "Users can view their own avatars"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permettre aux utilisateurs d'uploader leurs propres avatars
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permettre aux utilisateurs de mettre à jour leurs propres avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permettre aux utilisateurs de supprimer leurs propres avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);