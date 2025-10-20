import { useState } from 'react';
import { takePhoto, pickFromGallery, hapticImpact } from '@/lib/capacitor-native';
import { toast } from 'sonner';

export const useNativeCamera = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const capturePhoto = async () => {
    setIsLoading(true);
    await hapticImpact();
    
    try {
      const uri = await takePhoto();
      if (uri) {
        setPhotoUri(uri);
        toast.success('Photo capturée avec succès');
        return uri;
      } else {
        toast.error('Capture annulée');
        return null;
      }
    } catch (error) {
      toast.error('Erreur lors de la capture photo');
      console.error(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const selectPhoto = async () => {
    setIsLoading(true);
    await hapticImpact();
    
    try {
      const uri = await pickFromGallery();
      if (uri) {
        setPhotoUri(uri);
        toast.success('Photo sélectionnée avec succès');
        return uri;
      } else {
        toast.error('Sélection annulée');
        return null;
      }
    } catch (error) {
      toast.error('Erreur lors de la sélection');
      console.error(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearPhoto = () => {
    setPhotoUri(null);
  };

  return {
    isLoading,
    photoUri,
    capturePhoto,
    selectPhoto,
    clearPhoto
  };
};