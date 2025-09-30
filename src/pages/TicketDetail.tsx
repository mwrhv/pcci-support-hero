import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Mail } from "lucide-react";
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
      
      <div className="container mx-auto px-4 py-8 max-w-4xl print:py-4">
        <style>{`
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .print-container {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            @page {
              size: A4;
              margin: 1cm;
            }
          }
        `}</style>
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          
          <div className="flex gap-2">
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

        <Card className="print-container">
          <CardHeader>
            <div className="flex items-start justify-between print:block">
              <div>
                <CardTitle className="text-2xl print:text-xl print:mb-2">{ticket.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-2 print:text-base print:font-semibold print:text-foreground">
                  Code: {ticket.code}
                </p>
              </div>
              <Badge className="print:hidden">{ticket.status}</Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {metadata.type && (
                <div className="flex border-b pb-2">
                  <span className="font-semibold w-1/3">Type de fiche:</span>
                  <span className="w-2/3">{metadata.type}</span>
                </div>
              )}

              {metadata.prenom && (
                <div className="flex border-b pb-2">
                  <span className="font-semibold w-1/3">Prénom:</span>
                  <span className="w-2/3">{metadata.prenom}</span>
                </div>
              )}

              {metadata.nom && (
                <div className="flex border-b pb-2">
                  <span className="font-semibold w-1/3">Nom:</span>
                  <span className="w-2/3">{metadata.nom}</span>
                </div>
              )}

              {metadata.id_personnel && (
                <div className="flex border-b pb-2">
                  <span className="font-semibold w-1/3">ID Personnel:</span>
                  <span className="w-2/3">{metadata.id_personnel}</span>
                </div>
              )}

              {metadata.cni && (
                <div className="flex border-b pb-2">
                  <span className="font-semibold w-1/3">CNI:</span>
                  <span className="w-2/3">{metadata.cni}</span>
                </div>
              )}

              {metadata.demeurant && (
                <div className="flex border-b pb-2">
                  <span className="font-semibold w-1/3">Demeurant:</span>
                  <span className="w-2/3">{metadata.demeurant}</span>
                </div>
              )}

              {metadata.campagne && (
                <div className="flex border-b pb-2">
                  <span className="font-semibold w-1/3">Campagne:</span>
                  <span className="w-2/3">{metadata.campagne}</span>
                </div>
              )}

              {metadata.type_mouvement && (
                <div className="flex border-b pb-2">
                  <span className="font-semibold w-1/3">Type de mouvement:</span>
                  <span className="w-2/3">{metadata.type_mouvement}</span>
                </div>
              )}

              {metadata.nom_machine && (
                <div className="flex border-b pb-2">
                  <span className="font-semibold w-1/3">Nom Machine:</span>
                  <span className="w-2/3">{metadata.nom_machine}</span>
                </div>
              )}

              {metadata.place && (
                <div className="flex border-b pb-2">
                  <span className="font-semibold w-1/3">Place:</span>
                  <span className="w-2/3">{metadata.place}</span>
                </div>
              )}

              {metadata.numero_sim && (
                <div className="flex border-b pb-2">
                  <span className="font-semibold w-1/3">Numéro SIM:</span>
                  <span className="w-2/3">{metadata.numero_sim}</span>
                </div>
              )}

              {metadata.date_depart && (
                <div className="flex border-b pb-2">
                  <span className="font-semibold w-1/3">Date de départ:</span>
                  <span className="w-2/3">
                    {new Date(metadata.date_depart).toLocaleDateString()}
                  </span>
                </div>
              )}

              {metadata.date_retour && (
                <div className="flex border-b pb-2">
                  <span className="font-semibold w-1/3">Date de retour:</span>
                  <span className="w-2/3">
                    {new Date(metadata.date_retour).toLocaleDateString()}
                  </span>
                </div>
              )}

              <div className="flex border-b pb-2">
                <span className="font-semibold w-1/3">Description:</span>
                <span className="w-2/3 whitespace-pre-wrap">{ticket.description}</span>
              </div>

              <div className="flex border-b pb-2">
                <span className="font-semibold w-1/3">Date de création:</span>
                <span className="w-2/3">
                  {new Date(ticket.created_at).toLocaleDateString()} à {new Date(ticket.created_at).toLocaleTimeString()}
                </span>
              </div>

              <div className="flex border-b pb-2">
                <span className="font-semibold w-1/3">Priorité:</span>
                <span className="w-2/3">{ticket.priority}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
