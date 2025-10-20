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
import { z } from "zod";
import { useNativeCamera } from "@/hooks/useNativeCamera";
import { isNative } from "@/lib/capacitor-native";

const ticketSchema = z.object({
  title: z.string().trim().min(5, { message: "Le titre doit contenir au moins 5 caractères" }).max(200),
  description: z.string().trim().min(10, { message: "La description doit contenir au moins 10 caractères" }),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  categoryId: z.string().uuid({ message: "Catégorie invalide" }),
});

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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      setCategories(categoriesData || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des données");
      console.error(error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const priority = formData.get("priority") as string;
    const categoryId = formData.get("categoryId") as string;

    try {
      const validated = ticketSchema.parse({ 
        title, description, priority, categoryId
      });

      // Upload attachments first
      const uploadedFiles: Array<{name: string, size: number, path: string}> = [];
      for (const file of attachments) {
        const fileName = `${userId}/${Date.now()}_${file.name}`;
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("ticket-attachments")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Error uploading file:", uploadError);
          toast.error(`Erreur lors du téléchargement de ${file.name}`);
        } else if (uploadData) {
          uploadedFiles.push({
            name: file.name,
            size: file.size,
            path: fileName
          });
        }
      }

      const { data, error } = await supabase
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

      if (error) throw error;

      // Create initial audit log
      await supabase.from("ticket_updates").insert({
        ticket_id: data.id,
        author_id: userId,
        type: "comment",
        body: "Ticket créé",
      });

      // Get user profile for email notification
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .single();

      // Send email notification
      if (profileData?.email) {
        try {
          await supabase.functions.invoke("send-ticket-notification", {
            body: {
              type: "ticket_created",
              ticketId: data.id,
              ticketCode: data.code,
              ticketTitle: validated.title,
              recipientEmail: profileData.email,
              recipientName: profileData.full_name || "Utilisateur",
            },
          });
          console.log("Email notification sent successfully");
        } catch (emailError) {
          console.error("Error sending email notification:", emailError);
          // Don't fail the ticket creation if email fails
        }
      }

      toast.success("Ticket créé avec succès !");
      navigate(`/tickets/${data.id}`);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Erreur lors de la création du ticket");
        console.error(error);
      }
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
                <div className="flex items-center gap-2">
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={handleFileChange}
                    disabled={loading}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("attachments")?.click()}
                    disabled={loading}
                    className="w-full"
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    Joindre des documents ou photos
                  </Button>
                </div>
                
                {attachments.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="text-sm truncate flex-1">{file.name}</span>
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
