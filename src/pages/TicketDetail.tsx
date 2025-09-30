import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Mail, Plus } from "lucide-react";
import { toast } from "sonner";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchTicket = async () => {
      try {
        const { data, error } = await supabase
          .from("tickets")
          .select(`
            *,
            requester:profiles!tickets_requester_id_fkey(full_name, email),
            assignee:profiles!tickets_assignee_id_fkey(full_name, email)
          `)
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
          toast.error("Fiche non trouvée");
          navigate("/");
          return;
        }

        setTicket(data);
      } catch (error: any) {
        console.error(error);
        toast.error("Erreur lors du chargement de la fiche");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id, navigate]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const subject = `Fiche: ${ticket?.title || ""}`;
    const body = `Consultez cette fiche: ${window.location.href}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  const metadata = ticket.metadata || {};

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          
          <div className="flex gap-2">
            <Button onClick={() => navigate("/tickets/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau ticket
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimer
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Mail className="mr-2 h-4 w-4" />
              Partager
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{ticket.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">Code: {ticket.code}</p>
              </div>
              <Badge>{ticket.status}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {metadata.type && (
              <div className="pb-4 border-b">
                <h3 className="font-semibold mb-4">Type de fiche</h3>
                <p className="text-sm">{metadata.type}</p>
              </div>
            )}

            {(metadata.prenom || metadata.nom) && (
              <div className="pb-4 border-b">
                <h3 className="font-semibold mb-4">Informations personnelles</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {metadata.prenom && (
                    <div>
                      <span className="text-muted-foreground">Prénom:</span>
                      <p className="font-medium">{metadata.prenom}</p>
                    </div>
                  )}
                  {metadata.nom && (
                    <div>
                      <span className="text-muted-foreground">Nom:</span>
                      <p className="font-medium">{metadata.nom}</p>
                    </div>
                  )}
                  {metadata.id_personnel && (
                    <div>
                      <span className="text-muted-foreground">ID:</span>
                      <p className="font-medium">{metadata.id_personnel}</p>
                    </div>
                  )}
                  {metadata.cni && (
                    <div>
                      <span className="text-muted-foreground">CNI:</span>
                      <p className="font-medium">{metadata.cni}</p>
                    </div>
                  )}
                  {metadata.demeurant && (
                    <div>
                      <span className="text-muted-foreground">Demeurant:</span>
                      <p className="font-medium">{metadata.demeurant}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {metadata.campagne && (
              <div className="pb-4 border-b">
                <h3 className="font-semibold mb-4">Informations campagne</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Campagne:</span>
                    <p className="font-medium">{metadata.campagne}</p>
                  </div>
                  {metadata.type_mouvement && (
                    <div>
                      <span className="text-muted-foreground">Type de mouvement:</span>
                      <p className="font-medium">{metadata.type_mouvement}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(metadata.nom_machine || metadata.place) && (
              <div className="pb-4 border-b">
                <h3 className="font-semibold mb-4">Informations matériel</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {metadata.nom_machine && (
                    <div>
                      <span className="text-muted-foreground">Nom Machine:</span>
                      <p className="font-medium">{metadata.nom_machine}</p>
                    </div>
                  )}
                  {metadata.place && (
                    <div>
                      <span className="text-muted-foreground">Place:</span>
                      <p className="font-medium">{metadata.place}</p>
                    </div>
                  )}
                  {metadata.numero_sim && (
                    <div>
                      <span className="text-muted-foreground">Numéro SIM:</span>
                      <p className="font-medium">{metadata.numero_sim}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(metadata.date_depart || metadata.date_retour) && (
              <div className="pb-4 border-b">
                <h3 className="font-semibold mb-4">Dates</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {metadata.date_depart && (
                    <div>
                      <span className="text-muted-foreground">Date de départ:</span>
                      <p className="font-medium">{new Date(metadata.date_depart).toLocaleDateString()}</p>
                    </div>
                  )}
                  {metadata.date_retour && (
                    <div>
                      <span className="text-muted-foreground">Date de retour:</span>
                      <p className="font-medium">{new Date(metadata.date_retour).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-4">Description</h3>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t">
              <div>
                <span className="text-muted-foreground">Créé le:</span>
                <p className="font-medium">{new Date(ticket.created_at).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Priorité:</span>
                <p className="font-medium">{ticket.priority}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
