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
            .print-minimal-header {
              text-align: center;
              padding: 40px 20px;
              border-bottom: 1px solid #e5e7eb;
            }
            .print-minimal-title {
              font-size: 24px;
              font-weight: 300;
              letter-spacing: 0.5px;
              margin-bottom: 12px;
            }
            .print-minimal-code {
              font-size: 13px;
              color: #6b7280;
              font-weight: 400;
            }
            .print-minimal-body {
              padding: 50px 60px;
            }
            .print-minimal-field {
              margin-bottom: 35px;
              border-bottom: 1px solid #f3f4f6;
              padding-bottom: 20px;
            }
            .print-minimal-label {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              color: #9ca3af;
              margin-bottom: 8px;
              font-weight: 500;
            }
            .print-minimal-value {
              font-size: 15px;
              color: #1f2937;
              line-height: 1.7;
              font-weight: 300;
            }
            .print-minimal-footer {
              text-align: center;
              padding: 30px;
              border-top: 1px solid #e5e7eb;
              font-size: 11px;
              color: #9ca3af;
            }
            @page {
              size: A4;
              margin: 1.5cm;
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

        <Card className="print-container border-none shadow-none">
          {/* En-tête minimal (visible uniquement à l'impression) */}
          <div className="hidden print:block print-minimal-header">
            <div className="print-minimal-title">{ticket.title}</div>
            <div className="print-minimal-code">{ticket.code}</div>
          </div>

          {/* En-tête normal (visible à l'écran) */}
          <CardHeader className="print:hidden">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl font-light tracking-wide">{ticket.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  {ticket.code}
                </p>
              </div>
              <Badge>{ticket.status}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="print:p-0 print-minimal-body space-y-8">
            {metadata.type && (
              <div className="print-minimal-field">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 print-minimal-label">
                  Type de fiche
                </div>
                <div className="text-base font-light print-minimal-value">{metadata.type}</div>
              </div>
            )}

            {metadata.prenom && (
              <div className="print-minimal-field">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 print-minimal-label">
                  Prénom
                </div>
                <div className="text-base font-light print-minimal-value">{metadata.prenom}</div>
              </div>
            )}

            {metadata.nom && (
              <div className="print-minimal-field">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 print-minimal-label">
                  Nom
                </div>
                <div className="text-base font-light print-minimal-value">{metadata.nom}</div>
              </div>
            )}

            {metadata.id_personnel && (
              <div className="print-minimal-field">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 print-minimal-label">
                  ID Personnel
                </div>
                <div className="text-base font-light print-minimal-value">{metadata.id_personnel}</div>
              </div>
            )}

            {metadata.cni && (
              <div className="print-minimal-field">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 print-minimal-label">
                  CNI
                </div>
                <div className="text-base font-light print-minimal-value">{metadata.cni}</div>
              </div>
            )}

            {metadata.demeurant && (
              <div className="print-minimal-field">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 print-minimal-label">
                  Demeurant
                </div>
                <div className="text-base font-light print-minimal-value">{metadata.demeurant}</div>
              </div>
            )}

            {metadata.campagne && (
              <div className="print-minimal-field">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 print-minimal-label">
                  Campagne
                </div>
                <div className="text-base font-light print-minimal-value">{metadata.campagne}</div>
              </div>
            )}

            {metadata.type_mouvement && (
              <div className="print-minimal-field">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 print-minimal-label">
                  Type de mouvement
                </div>
                <div className="text-base font-light print-minimal-value">{metadata.type_mouvement}</div>
              </div>
            )}

            {metadata.nom_machine && (
              <div className="print-minimal-field">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 print-minimal-label">
                  Nom Machine
                </div>
                <div className="text-base font-light print-minimal-value">{metadata.nom_machine}</div>
              </div>
            )}

            {metadata.place && (
              <div className="print-minimal-field">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 print-minimal-label">
                  Place
                </div>
                <div className="text-base font-light print-minimal-value">{metadata.place}</div>
              </div>
            )}

            {metadata.numero_sim && (
              <div className="print-minimal-field">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 print-minimal-label">
                  Numéro SIM
                </div>
                <div className="text-base font-light print-minimal-value">{metadata.numero_sim}</div>
              </div>
            )}

            {metadata.date_depart && (
              <div className="print-minimal-field">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 print-minimal-label">
                  Date de départ
                </div>
                <div className="text-base font-light print-minimal-value">
                  {new Date(metadata.date_depart).toLocaleDateString()}
                </div>
              </div>
            )}

            {metadata.date_retour && (
              <div className="print-minimal-field">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 print-minimal-label">
                  Date de retour
                </div>
                <div className="text-base font-light print-minimal-value">
                  {new Date(metadata.date_retour).toLocaleDateString()}
                </div>
              </div>
            )}

            <div className="print-minimal-field">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 print-minimal-label">
                Description
              </div>
              <div className="text-base font-light whitespace-pre-wrap leading-relaxed print-minimal-value">
                {ticket.description}
              </div>
            </div>

            <div className="print-minimal-field">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 print-minimal-label">
                Priorité
              </div>
              <div className="text-base font-light print-minimal-value">{ticket.priority}</div>
            </div>

            <div className="print-minimal-field print:border-b-0">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 print-minimal-label">
                Date de création
              </div>
              <div className="text-base font-light print-minimal-value">
                {new Date(ticket.created_at).toLocaleDateString()} à {new Date(ticket.created_at).toLocaleTimeString()}
              </div>
            </div>
          </CardContent>

          {/* Pied de page minimal (visible uniquement à l'impression) */}
          <div className="hidden print:block print-minimal-footer">
            Document généré le {new Date().toLocaleDateString()}
          </div>
        </Card>
      </div>
    </div>
  );
}
