import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Briefcase, Shield, Loader2, KeyRound, Camera, Upload, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNativeCamera } from "@/hooks/useNativeCamera";
import { isNative } from "@/lib/capacitor-native";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { showError, safeAsync } from "@/utils/errorHandler";
import { escapeHtml, sanitizeString, validateFileType, validateFileSize, generateSecureFilename } from "@/utils/sanitizer";
import { newPasswordSchema } from "@/schemas/authSchemas";
import { z } from "zod";

type AppRole = 'agent' | 'supervisor' | 'admin';

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [userRole, setUserRole] = useState<AppRole>('agent');
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    department: "",
    avatar_url: "",
    pcci_id: "",
    gender: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { capturePhoto, selectPhoto } = useNativeCamera();
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      // Get authenticated user
      const { data: user, error: userError } = await safeAsync(async () => {
        const result = await supabase.auth.getUser();
        if (result.error) throw result.error;
        if (!result.data.user) throw new Error("Non authentifié");
        return result.data.user;
      }, "Chargement utilisateur");

      if (userError || !user) {
        navigate("/auth");
        return;
      }

      // Fetch profile data
      const { data: profileData, error: profileError } = await safeAsync(async () => {
        const result = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        if (result.error) throw result.error;
        return result.data;
      }, "Chargement du profil");

      if (profileError) {
        showError(profileError, "Erreur de chargement du profil");
        return;
      }

      if (profileData) {
        setProfile({
          full_name: sanitizeString(profileData.full_name || ""),
          email: sanitizeString(profileData.email || ""),
          department: sanitizeString(profileData.department || ""),
          avatar_url: profileData.avatar_url || "",
          pcci_id: sanitizeString(profileData.pcci_id || ""),
          gender: sanitizeString(profileData.gender || ""),
        });
      }

      // Fetch user role
      const { data: roleData } = await safeAsync(async () => {
        const result = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        return result.data;
      }, "Chargement du rôle");

      if (roleData) {
        setUserRole(roleData.role as AppRole);
      }
    } catch (error) {
      showError(error, "Chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate inputs
      const profileSchema = z.object({
        full_name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100, "Le nom ne doit pas dépasser 100 caractères"),
        department: z.string().max(100).optional(),
        pcci_id: z.string().max(50).optional(),
        gender: z.enum(["Homme", "Femme", "Autre", ""]).optional(),
      });

      const validatedData = profileSchema.parse({
        full_name: profile.full_name,
        department: profile.department,
        pcci_id: profile.pcci_id,
        gender: profile.gender,
      });

      // Get user with error handling
      const { data: user, error: userError } = await safeAsync(async () => {
        const result = await supabase.auth.getUser();
        if (result.error) throw result.error;
        if (!result.data.user) throw new Error("Non authentifié");
        return result.data.user;
      }, "Authentification");

      if (userError || !user) {
        showError(userError || new Error("Non authentifié"), "Authentification");
        return;
      }

      // Update profile with error handling
      const { error: updateError } = await safeAsync(async () => {
        const result = await supabase
          .from("profiles")
          .update({
            full_name: validatedData.full_name,
            department: validatedData.department || null,
            pcci_id: validatedData.pcci_id || null,
            gender: validatedData.gender || null,
          })
          .eq("id", user.id);
        if (result.error) throw result.error;
        return result;
      }, "Mise à jour du profil");

      if (updateError) {
        showError(updateError, "Mise à jour du profil");
        return;
      }

      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été enregistrées avec succès",
      });
    } catch (error) {
      showError(error, "Mise à jour du profil");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File | Blob, userId: string) => {
    // Generate secure filename
    const originalName = file instanceof File ? file.name : 'avatar.jpg';
    const secureFileName = generateSecureFilename(originalName, userId);
    const fileName = `${userId}/${secureFileName}`;

    // Upload with error handling
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      // Validate file type
      if (!validateFileType(file, ['image/jpeg', 'image/png', 'image/webp'])) {
        toast({
          title: "Erreur",
          description: "Seuls les fichiers JPEG, PNG et WebP sont acceptés",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB max)
      if (!validateFileSize(file, 5 * 1024 * 1024)) {
        toast({
          title: "Erreur",
          description: "La photo ne doit pas dépasser 5MB",
          variant: "destructive",
        });
        return;
      }

      // Get user with error handling
      const { data: user, error: userError } = await safeAsync(async () => {
        const result = await supabase.auth.getUser();
        if (result.error) throw result.error;
        if (!result.data.user) throw new Error("Non authentifié");
        return result.data.user;
      }, "Authentification");

      if (userError || !user) {
        showError(userError || new Error("Non authentifié"), "Authentification");
        return;
      }

      // Upload avatar with error handling
      const { data: avatarUrl, error: uploadError } = await safeAsync(
        async () => await uploadAvatar(file, user.id),
        "Upload de la photo"
      );

      if (uploadError || !avatarUrl) {
        showError(uploadError || new Error("Échec de l'upload"), "Upload de la photo");
        return;
      }

      // Update profile with error handling
      const { error: updateError } = await safeAsync(async () => {
        const result = await supabase
          .from("profiles")
          .update({ avatar_url: avatarUrl })
          .eq("id", user.id);
        if (result.error) throw result.error;
        return result;
      }, "Mise à jour du profil");

      if (updateError) {
        showError(updateError, "Mise à jour du profil");
        return;
      }

      setProfile({ ...profile, avatar_url: avatarUrl });
      toast({
        title: "Photo mise à jour",
        description: "Votre photo de profil a été modifiée avec succès",
      });
    } catch (error) {
      showError(error, "Upload de la photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!validateFileType(file, ['image/jpeg', 'image/png', 'image/webp'])) {
        toast({
          title: "Erreur",
          description: "Seuls les fichiers JPEG, PNG et WebP sont acceptés",
          variant: "destructive",
        });
        return;
      }

      // Validate file size
      if (!validateFileSize(file, 5 * 1024 * 1024)) {
        toast({
          title: "Erreur",
          description: "La photo ne doit pas dépasser 5MB",
          variant: "destructive",
        });
        return;
      }

      // Open crop dialog
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setCropDialogOpen(true);
      };
      reader.onerror = () => {
        toast({
          title: "Erreur",
          description: "Impossible de lire le fichier",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    await handleAvatarUpload(new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" }));
  };

  const handleNativePhoto = async (action: 'camera' | 'gallery') => {
    try {
      const photoUri = action === 'camera' 
        ? await capturePhoto() 
        : await selectPhoto();

      if (!photoUri) {
        return;
      }

      // Open crop dialog with the native photo
      setImageToCrop(photoUri);
      setCropDialogOpen(true);
    } catch (error) {
      showError(error, "Capture de photo");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);

    try {
      // Validate password with schema
      const validatedData = newPasswordSchema.parse({
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      // Verify current password
      const { error: signInError } = await safeAsync(async () => {
        const result = await supabase.auth.signInWithPassword({
          email: profile.email,
          password: passwordForm.currentPassword,
        });
        if (result.error) throw new Error("Le mot de passe actuel est incorrect");
        return result;
      }, "Vérification du mot de passe");

      if (signInError) {
        showError(signInError, "Vérification du mot de passe");
        return;
      }

      // Update password with error handling
      const { error: updateError } = await safeAsync(async () => {
        const result = await supabase.auth.updateUser({
          password: validatedData.password,
        });
        if (result.error) throw result.error;
        return result;
      }, "Changement du mot de passe");

      if (updateError) {
        showError(updateError, "Changement du mot de passe");
        return;
      }

      toast({
        title: "Mot de passe modifié",
        description: "Votre mot de passe a été changé avec succès",
      });

      // Reset form
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      showError(error, "Changement du mot de passe");
    } finally {
      setChangingPassword(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Mon Profil</h1>
          <p className="text-muted-foreground">Gérez vos informations personnelles</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations Personnelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center mb-6 space-y-4">
              <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  <span dangerouslySetInnerHTML={{ __html: escapeHtml(profile.full_name ? getInitials(profile.full_name) : "U") }} />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex gap-2">
                {isNative() ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleNativePhoto('camera')}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Camera className="h-4 w-4 mr-2" />
                          Prendre une photo
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleNativePhoto('gallery')}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Galerie
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Changer la photo
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nom complet
                </Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Votre nom complet"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  L'email ne peut pas être modifié
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Type de Profil
                </Label>
                <div className="flex items-center h-10 px-3 py-2 border border-input bg-muted rounded-md">
                  <Badge 
                    variant={userRole === 'admin' ? 'default' : 'secondary'}
                    className={
                      userRole === 'admin' 
                        ? 'bg-red-100 text-red-800' 
                        : userRole === 'supervisor'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  >
                    <span dangerouslySetInnerHTML={{ 
                      __html: escapeHtml(userRole === 'admin' ? 'Administrateur' : userRole === 'supervisor' ? 'Superviseur' : 'Agent') 
                    }} />
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Seul un administrateur peut modifier votre type de profil
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Département
                </Label>
                <Input
                  id="department"
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                  placeholder="Votre département"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pcci_id" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  ID PCCI
                </Label>
                <Input
                  id="pcci_id"
                  value={profile.pcci_id}
                  onChange={(e) => setProfile({ ...profile, pcci_id: e.target.value })}
                  placeholder="Votre identifiant PCCI"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender" className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  Genre
                </Label>
                <Select
                  value={profile.gender}
                  onValueChange={(value) => setProfile({ ...profile, gender: value })}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Sélectionner votre genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Homme">Homme</SelectItem>
                    <SelectItem value="Femme">Femme</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    "Enregistrer les modifications"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/")}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <ImageCropDialog
          open={cropDialogOpen}
          imageSrc={imageToCrop}
          onCropComplete={handleCroppedImage}
          onClose={() => setCropDialogOpen(false)}
        />

        {userRole === 'admin' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Changer le mot de passe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">
                    Mot de passe actuel
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Entrez votre mot de passe actuel"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">
                    Nouveau mot de passe
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Entrez votre nouveau mot de passe"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Le mot de passe doit contenir au moins 6 caractères
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirmer le nouveau mot de passe
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Confirmez votre nouveau mot de passe"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={changingPassword}>
                    {changingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changement en cours...
                      </>
                    ) : (
                      "Changer le mot de passe"
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setPasswordForm({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    })}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}