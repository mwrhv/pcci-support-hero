import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { ArrowLeft, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
  type_mouvement: z.enum(["Démission", "Retour sur site"], { message: "Le type de mouvement est requis" }),
  nom_machine: z.string().trim().min(1, { message: "Le nom de la machine est requis" }),
  place: z.string().trim().min(1, { message: "La place est requise" }),
  numero_sim: z.string().optional(),
  date_retour: z.date({ required_error: "La date de retour est requise" }),
});

export default function FicheRetourMateriel() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showActions, setShowActions] = useState(false);
  const [createdFiche, setCreatedFiche] = useState<any>(null);
  const [dateRetour, setDateRetour] = useState<Date>();

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
    const type_mouvement = formData.get("type_mouvement") as string;
    const nom_machine = formData.get("nom_machine") as string;
    const place = formData.get("place") as string;
    const numero_sim = formData.get("numero_sim") as string;

    try {
      if (!dateRetour) {
        toast.error("Veuillez sélectionner une date de retour");
        setLoading(false);
        return;
      }

      if (!userProfile) {
        toast.error("Impossible de récupérer les informations du profil");
        setLoading(false);
        return;
      }

      const validated = ficheSchema.parse({ 
        description, prenom, nom, id_personnel, cni, telephone, demeurant,
        campagne, fonction, type_mouvement,
        nom_machine, place, numero_sim,
        date_retour: dateRetour
      });

      const title = `Retour Matériel - ${userProfile.full_name} - ${validated.campagne}`;

      // Get category ID for "Retour Matériel"
      const { data: categoryData } = await supabase
        .from("categories")
        .select("id")
        .eq("name", "Retour Matériel")
        .single();

      const metadata = {
        type: "Fiche Retour Matériel",
        prenom: validated.prenom,
        nom: validated.nom,
        id_personnel: validated.id_personnel,
        cni: validated.cni,
        telephone: validated.telephone,
        demeurant: validated.demeurant,
        campagne: validated.campagne,
        fonction: validated.fonction,
        type_mouvement: validated.type_mouvement,
        utilisateur: userProfile.full_name,
        email: userProfile.email,
        departement: userProfile.department,
        nom_machine: validated.nom_machine,
        place: validated.place,
        date_retour: format(validated.date_retour, "dd/MM/yyyy"),
        ...(validated.numero_sim && { numero_sim: validated.numero_sim }),
      };

      const { data, error } = await supabase
        .from("tickets")
        .insert({
          title: title,
          description: validated.description,
          priority: "Medium" as any,
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
        body: "Fiche Retour Matériel créée",
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
            <CardTitle>Fiche Retour Matériel</CardTitle>
            <CardDescription>
              Créer une fiche de retour de matériel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Informations du conseiller</h3>
                
                <div className="bg-muted p-4 rounded-md space-y-2">
                  <p className="text-sm"><span className="font-semibold">Compte:</span> {userProfile?.full_name || "Chargement..."}</p>
                  <p className="text-sm"><span className="font-semibold">Email:</span> {userProfile?.email || "Chargement..."}</p>
                  {userProfile?.department && (
                    <p className="text-sm"><span className="font-semibold">Département:</span> {userProfile.department}</p>
                  )}
                </div>

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type_mouvement">Type de mouvement *</Label>
                  <Select name="type_mouvement" required disabled={loading}>
                    <SelectTrigger id="type_mouvement">
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Démission">Démission</SelectItem>
                      <SelectItem value="Retour sur site">Retour sur site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date de retour *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRetour && "text-muted-foreground"
                        )}
                        disabled={loading}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRetour ? format(dateRetour, "dd/MM/yyyy") : <span>Sélectionner une date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRetour}
                        onSelect={setDateRetour}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
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
                  placeholder="Décrivez en détail le retour matériel..."
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
