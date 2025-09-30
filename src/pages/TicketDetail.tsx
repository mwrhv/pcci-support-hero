import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Mail } from "lucide-react";
import { toast } from "sonner";
import pcciLogo from "@/assets/pcci-logo.png";

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
              border: 3px solid #1e40af;
              border-radius: 8px;
              overflow: hidden;
            }
            .print-id-header {
              background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
              color: white;
              padding: 20px 30px;
              display: grid;
              grid-template-columns: auto 1fr;
              gap: 20px;
              align-items: center;
            }
            .print-logo {
              max-height: 70px;
              width: auto;
              background: white;
              padding: 8px;
              border-radius: 4px;
            }
            .print-title-box h1 {
              margin: 0;
              font-size: 20px;
              font-weight: 700;
            }
            .print-title-box p {
              margin: 5px 0 0 0;
              font-size: 13px;
              opacity: 0.95;
            }
            .print-id-body {
              padding: 25px 30px;
            }
            .print-row {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            .print-field-card {
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 12px;
              background: #f9fafb;
            }
            .print-field-card-label {
              font-size: 10px;
              text-transform: uppercase;
              color: #6b7280;
              font-weight: 600;
              margin-bottom: 6px;
              letter-spacing: 0.5px;
            }
            .print-field-card-value {
              font-size: 13px;
              color: #1f2937;
              font-weight: 500;
            }
            .print-full-width {
              grid-column: 1 / -1;
            }
            .print-description {
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 15px;
              background: white;
              margin-top: 10px;
              white-space: pre-wrap;
              font-size: 12px;
              line-height: 1.6;
            }
            .print-footer {
              background: #f3f4f6;
              padding: 15px 30px;
              border-top: 2px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #6b7280;
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

        <Card className="print-container">
          {/* En-tête style carte d'identité (visible uniquement à l'impression) */}
          <div className="hidden print:block print-id-header">
            <img src={pcciLogo} alt="Logo" className="print-logo" />
            <div className="print-title-box">
              <h1>{ticket.title}</h1>
              <p>Code: {ticket.code} | {new Date(ticket.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* En-tête normal (visible à l'écran) */}
          <CardHeader className="print:hidden">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{ticket.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Code: {ticket.code}
                </p>
              </div>
              <Badge>{ticket.status}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="print:p-0 print-id-body">
            <div className="print-row">
              {metadata.type && (
                <div className="print-field-card">
                  <div className="print-field-card-label">Type de fiche</div>
                  <div className="print-field-card-value">{metadata.type}</div>
                </div>
              )}
              {metadata.campagne && (
                <div className="print-field-card">
                  <div className="print-field-card-label">Campagne</div>
                  <div className="print-field-card-value">{metadata.campagne}</div>
                </div>
              )}
            </div>

            <div className="print-row">
              {metadata.prenom && (
                <div className="print-field-card">
                  <div className="print-field-card-label">Prénom</div>
                  <div className="print-field-card-value">{metadata.prenom}</div>
                </div>
              )}
              {metadata.nom && (
                <div className="print-field-card">
                  <div className="print-field-card-label">Nom</div>
                  <div className="print-field-card-value">{metadata.nom}</div>
                </div>
              )}
            </div>

            <div className="print-row">
              {metadata.id_personnel && (
                <div className="print-field-card">
                  <div className="print-field-card-label">ID Personnel</div>
                  <div className="print-field-card-value">{metadata.id_personnel}</div>
                </div>
              )}
              {metadata.cni && (
                <div className="print-field-card">
                  <div className="print-field-card-label">CNI</div>
                  <div className="print-field-card-value">{metadata.cni}</div>
                </div>
              )}
            </div>

            {metadata.demeurant && (
              <div className="print-row">
                <div className="print-field-card print-full-width">
                  <div className="print-field-card-label">Demeurant</div>
                  <div className="print-field-card-value">{metadata.demeurant}</div>
                </div>
              </div>
            )}

            <div className="print-row">
              {metadata.type_mouvement && (
                <div className="print-field-card">
                  <div className="print-field-card-label">Type de mouvement</div>
                  <div className="print-field-card-value">{metadata.type_mouvement}</div>
                </div>
              )}
              {metadata.priority && (
                <div className="print-field-card">
                  <div className="print-field-card-label">Priorité</div>
                  <div className="print-field-card-value">{ticket.priority}</div>
                </div>
              )}
            </div>

            <div className="print-row">
              {metadata.nom_machine && (
                <div className="print-field-card">
                  <div className="print-field-card-label">Nom Machine</div>
                  <div className="print-field-card-value">{metadata.nom_machine}</div>
                </div>
              )}
              {metadata.place && (
                <div className="print-field-card">
                  <div className="print-field-card-label">Place</div>
                  <div className="print-field-card-value">{metadata.place}</div>
                </div>
              )}
            </div>

            {metadata.numero_sim && (
              <div className="print-row">
                <div className="print-field-card print-full-width">
                  <div className="print-field-card-label">Numéro SIM</div>
                  <div className="print-field-card-value">{metadata.numero_sim}</div>
                </div>
              </div>
            )}

            <div className="print-row">
              {metadata.date_depart && (
                <div className="print-field-card">
                  <div className="print-field-card-label">Date de départ</div>
                  <div className="print-field-card-value">
                    {new Date(metadata.date_depart).toLocaleDateString()}
                  </div>
                </div>
              )}
              {metadata.date_retour && (
                <div className="print-field-card">
                  <div className="print-field-card-label">Date de retour</div>
                  <div className="print-field-card-value">
                    {new Date(metadata.date_retour).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {ticket.description && (
              <div className="print-row">
                <div className="print-field-card print-full-width">
                  <div className="print-field-card-label">Description</div>
                  <div className="print-description">{ticket.description}</div>
                </div>
              </div>
            )}
          </CardContent>

          {/* Pied de page style carte d'identité (visible uniquement à l'impression) */}
          <div className="hidden print:block print-footer">
            <div>Statut: {ticket.status}</div>
            <div>Créé le: {new Date(ticket.created_at).toLocaleDateString()} à {new Date(ticket.created_at).toLocaleTimeString()}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
