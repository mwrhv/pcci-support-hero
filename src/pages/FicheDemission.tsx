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
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { FicheActions } from "@/components/FicheActions";

const ficheSchema = z.object({
  description: z.string().trim().min(10, { message: "La description doit contenir au moins 10 caractères" }),
  prenom: z.string().trim().min(1, { message: "Le prénom est requis" }).max(100),
  nom: z.string().trim().min(1, { message: "Le nom est requis" }).max(100),
  id_personnel: z.string().trim().min(1, { message: "L'ID personnel est requis" }).max(50),
  cni: z.string().trim().min(1, { message: "Le numéro CNI est requis" }).max(50),
  telephone: z.string().trim().min(1, { message: "Le numéro de téléphone est requis" }).max(20),
  demeurant: z.string().trim().min(1, { message: "L'adresse est requise" }).max(500),
  campagne: z.enum(["ORANGE", "YAS", "EXPRESSO", "CANAL"], { message: "La campagne est requise" }),
  fonction: z.enum(["CONSEILLER COMMERCIAL", "CONSEILLERE COMMERCIALE", "SUPERVISEUR", "TECHNICIEN"], { message: "La fonction est requise" }),
  date_demission: z.string().min(1, { message: "La date de démission est requise" }),
  motif: z.string().trim().min(10, { message: "Le motif doit contenir au moins 10 caractères" }),
});

export default function FicheDemission() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showActions, setShowActions] = useState(false);
  const [createdFiche, setCreatedFiche] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setUserProfile(profile);
      }
    };
    fetchUserData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const description = formData.get("description") as string;
    const prenom = formData.get("prenom") as string;
    const nom = formData.get("nom") as string;
    const id_personnel = formData.get("id_personnel") as string;
    const cni = formData.get("cni") as string;
    const telephone = formData.get("telephone") as string;
    const demeurant = formData.get("demeurant") as string;
    const campagne = formData.get("campagne") as string;
    const fonction = formData.get("fonction") as string;
    const date_demission = formData.get("date_demission") as string;
    const motif = formData.get("motif") as string;

    try {
      if (!userProfile) {
        toast.error("Impossible de récupérer les informations du profil");
        setLoading(false);
        return;
      }

      const validated = ficheSchema.parse({ 
        description, prenom, nom, id_personnel, cni, telephone, demeurant,
        campagne, fonction, date_demission, motif 
      });

      const title = `Démission - ${userProfile.full_name} - ${validated.campagne}`;

      // Get category ID for "Démission"
      const { data: categoryData } = await supabase
        .from("categories")
        .select("id")
        .eq("name", "Démission")
        .single();

      const metadata = {
        type: "Fiche Démission",
        prenom: validated.prenom,
        nom: validated.nom,
        id_personnel: validated.id_personnel,
        cni: validated.cni,
        telephone: validated.telephone,
        demeurant: validated.demeurant,
        campagne: validated.campagne,
        fonction: validated.fonction,
        utilisateur: userProfile.full_name,
        email: userProfile.email,
        departement: userProfile.department,
        date_demission: validated.date_demission,
        motif: validated.motif,
      };

      const { data, error } = await supabase
        .from("tickets")
        .insert({
          title: title,
          description: validated.description,
          priority: "High" as any,
          status: "Resolved" as any,
          requester_id: userId,
          category_id: categoryData?.id,
          code: "",
          metadata,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("ticket_updates").insert({
        ticket_id: data.id,
        author_id: userId,
        type: "comment",
        body: "Fiche Démission créée",
      });

      setCreatedFiche(data);
      setShowActions(true);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Erreur lors de la création de la fiche");
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
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au tableau de bord
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Fiche Démission</CardTitle>
            <CardDescription>
              Créer une fiche de démission d'employé
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Informations du conseiller</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom *</Label>
                    <Input id="prenom" name="prenom" required disabled={loading} maxLength={100} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom *</Label>
                    <Input id="nom" name="nom" required disabled={loading} maxLength={100} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="id_personnel">ID Personnel *</Label>
                    <Input id="id_personnel" name="id_personnel" required disabled={loading} maxLength={50} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cni">Numéro CNI *</Label>
                    <Input id="cni" name="cni" required disabled={loading} maxLength={50} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telephone">Numéro de téléphone *</Label>
                    <Input id="telephone" name="telephone" type="tel" required disabled={loading} maxLength={20} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demeurant">Adresse (Demeurant) *</Label>
                  <Textarea
                    id="demeurant"
                    name="demeurant"
                    placeholder="Adresse complète..."
                    rows={2}
                    required
                    disabled={loading}
                    maxLength={500}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="campagne">Campagne *</Label>
                  <Select name="campagne" required disabled={loading}>
                    <SelectTrigger id="campagne">
                      <SelectValue placeholder="Sélectionner la campagne" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ORANGE">ORANGE</SelectItem>
                      <SelectItem value="YAS">YAS</SelectItem>
                      <SelectItem value="EXPRESSO">EXPRESSO</SelectItem>
                      <SelectItem value="CANAL">CANAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fonction">Fonction *</Label>
                  <Select name="fonction" required disabled={loading}>
                    <SelectTrigger id="fonction">
                      <SelectValue placeholder="Sélectionner la fonction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONSEILLER COMMERCIAL">CONSEILLER COMMERCIAL</SelectItem>
                      <SelectItem value="CONSEILLERE COMMERCIALE">CONSEILLERE COMMERCIALE</SelectItem>
                      <SelectItem value="SUPERVISEUR">SUPERVISEUR</SelectItem>
                      <SelectItem value="TECHNICIEN">TECHNICIEN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Informations de démission</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="date_demission">Date de démission *</Label>
                  <Input 
                    id="date_demission" 
                    name="date_demission" 
                    type="date" 
                    required 
                    disabled={loading} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motif">Motif de la démission *</Label>
                  <Textarea
                    id="motif"
                    name="motif"
                    placeholder="Expliquez le motif de la démission..."
                    rows={3}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="border-t pt-6 space-y-2">
                <Label htmlFor="description">Description complémentaire *</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Ajoutez toute information complémentaire..."
                  rows={4}
                  required
                  disabled={loading}
                />
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Créé par</h3>
                
                <div className="bg-muted p-4 rounded-md space-y-2">
                  <p className="text-sm"><span className="font-semibold">Compte:</span> {userProfile?.full_name || "Chargement..."}</p>
                  <p className="text-sm"><span className="font-semibold">Email:</span> {userProfile?.email || "Chargement..."}</p>
                  {userProfile?.department && (
                    <p className="text-sm"><span className="font-semibold">Département:</span> {userProfile.department}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                  disabled={loading}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Création..." : "Créer la fiche"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {createdFiche && (
        <FicheActions
          isOpen={showActions}
          onClose={() => {
            setShowActions(false);
            navigate(`/tickets/${createdFiche.id}`);
          }}
          ficheData={createdFiche}
        />
      )}
    </div>
  );
}
