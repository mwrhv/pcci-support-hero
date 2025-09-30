import { useState } from "react";
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

const ficheSchema = z.object({
  description: z.string().trim().min(10, { message: "La description doit contenir au moins 10 caractères" }),
  campagne: z.enum(["ORANGE", "YAS", "EXPRESSO", "CANAL"], { message: "La campagne est requise" }),
  prenom: z.string().trim().min(2, { message: "Le prénom est requis" }),
  nom: z.string().trim().min(2, { message: "Le nom est requis" }),
  cni: z.string().trim().min(1, { message: "Le CNI est requis" }),
  demeurant: z.string().trim().min(1, { message: "Le demeurant est requis" }),
  nom_machine: z.string().trim().min(1, { message: "Le nom de la machine est requis" }),
  place: z.string().trim().min(1, { message: "La place est requise" }),
  numero_sim: z.string().optional(),
});

export default function FicheDepartTeletravail() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");

  useState(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const description = formData.get("description") as string;
    const campagne = formData.get("campagne") as string;
    const prenom = formData.get("prenom") as string;
    const nom = formData.get("nom") as string;
    const cni = formData.get("cni") as string;
    const demeurant = formData.get("demeurant") as string;
    const nom_machine = formData.get("nom_machine") as string;
    const place = formData.get("place") as string;
    const numero_sim = formData.get("numero_sim") as string;

    try {
      const validated = ficheSchema.parse({ 
        description, campagne,
        prenom, nom, cni, demeurant, nom_machine, place, numero_sim 
      });

      const title = `Départ Télétravail - ${validated.prenom} ${validated.nom} - ${validated.campagne}`;

      const metadata = {
        type: "Fiche Départ Télétravail",
        campagne: validated.campagne,
        prenom: validated.prenom,
        nom: validated.nom,
        cni: validated.cni,
        demeurant: validated.demeurant,
        nom_machine: validated.nom_machine,
        place: validated.place,
        ...(validated.numero_sim && { numero_sim: validated.numero_sim }),
      };

      const { data, error } = await supabase
        .from("tickets")
        .insert({
          title: title,
          description: validated.description,
          priority: "Medium" as any,
          requester_id: userId,
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
        body: "Fiche Départ Télétravail créée",
      });

      toast.success("Fiche créée avec succès !");
      navigate(`/tickets/${data.id}`);
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
            <CardTitle>Fiche Départ Télétravail</CardTitle>
            <CardDescription>
              Créer une fiche de départ en télétravail
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Informations personnelles</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom *</Label>
                    <Input id="prenom" name="prenom" required disabled={loading} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom *</Label>
                    <Input id="nom" name="nom" required disabled={loading} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cni">CNI *</Label>
                    <Input id="cni" name="cni" required disabled={loading} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="demeurant">Demeurant *</Label>
                    <Input id="demeurant" name="demeurant" required disabled={loading} />
                  </div>
                </div>
              </div>

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

              <div className="border-t pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Informations matériel</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom_machine">Nom Machine *</Label>
                    <Input id="nom_machine" name="nom_machine" required disabled={loading} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="place">Place *</Label>
                    <Input id="place" name="place" required disabled={loading} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numero_sim">Numéro SIM</Label>
                    <Input id="numero_sim" name="numero_sim" disabled={loading} />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6 space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Décrivez en détail votre demande de télétravail..."
                  rows={4}
                  required
                  disabled={loading}
                />
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
    </div>
  );
}
