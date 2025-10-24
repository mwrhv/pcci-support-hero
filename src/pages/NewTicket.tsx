import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { ArrowLeft, Camera, Image as ImageIcon, X, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { useNativeCamera } from "@/hooks/useNativeCamera";
import { isNative } from "@/lib/capacitor-native";

// Import des nouvelles fonctionnalités de sécurité
import { createTicketSchema, attachmentSchema } from "@/schemas/ticketSchemas";
import { showError, safeAsync } from "@/utils/errorHandler";
import { 
  ticketRateLimiter, 
  checkRateLimit, 
  getSessionId,
  fileUploadRateLimiter 
} from "@/utils/security";
import { 
  generateSecureFilename,
  validateFileSize,
  validateFileType 
} from "@/utils/sanitizer";

export default function NewTicket() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const { isLoading: cameraLoading, photoUri, capturePhoto, selectPhoto, clearPhoto } = useNativeCamera();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data, error } = await safeAsync(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      setUserId(user.id);

      const { data: categoriesData, error: catError } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      
      if (catError) throw catError;
      
      setCategories(categoriesData || []);
      return categoriesData;
    }, "Chargement des données");

    if (error) {
      showError(error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    try {
      const newFiles = Array.from(files);
      
      // Validation de chaque fichier
      const validFiles: File[] = [];
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ];

      for (const file of newFiles) {
        try {
          // Validation avec schema Zod
          attachmentSchema.parse({
            name: file.name,
            size: file.size,
            type: file.type
          });

          // Validation supplémentaire
          if (!validateFileSize(file, 10 * 1024 * 1024)) {
            toast.error(`${file.name} : Fichier trop volumineux (max 10MB)`);
            continue;
          }

          if (!validateFileType(file, allowedTypes)) {
            toast.error(`${file.name} : Type de fichier non supporté`);
            continue;
          }

          validFiles.push(file);
        } catch (error) {
          showError(error, `Validation de ${file.name}`);
        }
      }

      // Vérifier le nombre total de fichiers (max 5)
      if (attachments.length + validFiles.length > 5) {
        toast.error("Maximum 5 fichiers autorisés");
        const remaining = 5 - attachments.length;
        setAttachments(prev => [...prev, ...validFiles.slice(0, remaining)]);
      } else {
        setAttachments(prev => [...prev, ...validFiles]);
      }

      // Reset l'input
      e.target.value = '';
    } catch (error) {
      showError(error, "Ajout de fichiers");
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Rate Limiting - Protection contre l'abus
      const sessionId = getSessionId();
      checkRateLimit(
        ticketRateLimiter,
        sessionId,
        "Vous créez des tickets trop rapidement. Veuillez patienter."
      );

      // 2. Extraction et validation des données avec Zod
      const formData = new FormData(e.currentTarget);
      const validated = createTicketSchema.parse({ 
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        priority: formData.get("priority") as string,
        categoryId: formData.get("categoryId") as string,
        attachments: attachments.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type
        }))
      });

      // 3. Upload sécurisé des fichiers avec rate limiting
      const uploadedFiles: Array<{name: string, size: number, path: string}> = [];
      
      for (const file of attachments) {
        // Rate limit sur les uploads
        checkRateLimit(
          fileUploadRateLimiter,
          sessionId,
          "Trop d'uploads. Veuillez patienter."
        );

        // Génère un nom de fichier sécurisé
        const secureFileName = generateSecureFilename(file.name, userId);
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("ticket-attachments")
          .upload(secureFileName, file);

        if (uploadError) {
          showError(uploadError, `Upload de ${file.name}`);
        } else if (uploadData) {
          uploadedFiles.push({
            name: file.name,
            size: file.size,
            path: secureFileName
          });
        }
      }

      // 4. Création du ticket avec gestion d'erreurs améliorée
      const { data, error } = await safeAsync(async () => {
        const result = await supabase
          .from("tickets")
          .insert({
            title: validated.title,
            description: validated.description,
            priority: validated.priority as any,
            category_id: validated.categoryId,
            requester_id: userId,
            code: "",
            metadata: { attachments: uploadedFiles },
          })
          .select()
          .single();

        if (result.error) throw result.error;
        return result.data;
      }, "Création du ticket");

      if (error || !data) {
        showError(error || new Error("Erreur inconnue"));
        return;
      }

      // 5. Création du log d'audit
      await safeAsync(async () => {
        const result = await supabase.from("ticket_updates").insert({
          ticket_id: data.id,
          author_id: userId,
          type: "comment",
          body: "Ticket créé",
        });
        
        if (result.error) throw result.error;
      }, "Création du log");

      // 6. Notification par email (ne bloque pas si échoue)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .single();

      if (profileData?.email) {
        // Envoi asynchrone sans bloquer
        supabase.functions.invoke("send-ticket-notification", {
          body: {
            type: "ticket_created",
            ticketId: data.id,
            ticketCode: data.code,
            ticketTitle: validated.title,
            recipientEmail: profileData.email,
            recipientName: profileData.full_name || "Utilisateur",
          },
        }).catch(err => {
          // Log mais ne bloque pas
          if (import.meta.env.DEV) {
            console.error("Email notification error:", err);
          }
        });
      }

      // 7. Succès !
      toast.success("Ticket créé avec succès !", {
        description: `Référence: ${data.code}`,
        action: {
          label: "Voir",
          onClick: () => navigate(`/tickets/${data.id}`)
        }
      });
      
      navigate(`/tickets/${data.id}`);
    } catch (error) {
      showError(error, "Création du ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/tickets")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux tickets
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Créer un nouveau ticket</CardTitle>
            <CardDescription>
              Décrivez votre problème ou demande d'assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Résumé du problème"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Décrivez en détail votre problème ou demande..."
                  rows={6}
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priorité *</Label>
                  <Select name="priority" defaultValue="Medium" required disabled={loading}>
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Sélectionner la priorité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Basse</SelectItem>
                      <SelectItem value="Medium">Moyenne</SelectItem>
                      <SelectItem value="High">Haute</SelectItem>
                      <SelectItem value="Critical">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryId">Catégorie *</Label>
                  <Select name="categoryId" required disabled={loading}>
                    <SelectTrigger id="categoryId">
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Attachments Field */}
              <div className="space-y-2">
                <Label htmlFor="attachments">Pièces jointes</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Max 5 fichiers, 10MB chacun. Formats: images, PDF, Word, Excel, texte
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={handleFileChange}
                    disabled={loading || attachments.length >= 5}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("attachments")?.click()}
                    disabled={loading || attachments.length >= 5}
                    className="w-full"
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    {attachments.length >= 5 
                      ? "Limite de fichiers atteinte" 
                      : "Joindre des documents ou photos"
                    }
                  </Button>
                </div>
                
                {attachments.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-xs text-muted-foreground">
                      {attachments.length} / 5 fichiers
                    </p>
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm truncate block">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAttachment(index)}
                          disabled={loading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Native Camera Feature */}
              {isNative() && (
                <div className="space-y-2">
                  <Label>Photo (Caméra native)</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={capturePhoto}
                      disabled={loading || cameraLoading}
                      className="flex-1"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Prendre une photo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={selectPhoto}
                      disabled={loading || cameraLoading}
                      className="flex-1"
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Galerie
                    </Button>
                  </div>
                  
                  {photoUri && (
                    <div className="relative mt-4">
                      <img 
                        src={photoUri} 
                        alt="Pièce jointe" 
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={clearPhoto}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/tickets")}
                  disabled={loading}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Création..." : "Créer le ticket"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
