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
              background: white;
            }
            .print-container {
              page-break-inside: avoid;
              break-inside: avoid;
              background: white;
            }
            .print-modern-header {
              padding: 30px 40px;
              border-bottom: 2px solid #000000;
              background: white;
            }
            .print-logo {
              max-height: 70px;
              width: auto;
              margin-bottom: 20px;
            }
            .print-title {
              font-size: 24px;
              font-weight: 700;
              color: #000000;
              margin-bottom: 8px;
            }
            .print-subtitle {
              font-size: 14px;
              color: #000000;
              font-weight: 400;
            }
            .print-modern-body {
              padding: 30px 40px;
              background: white;
            }
            .print-cards-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin-bottom: 20px;
            }
            .print-card {
              border: 2px solid #000000;
              border-radius: 8px;
              padding: 20px;
              background: white;
              page-break-inside: avoid;
            }
            .print-card-full {
              grid-column: 1 / -1;
            }
            .print-card-title {
              font-size: 10px;
              font-weight: 700;
              color: #000000;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
            }
            .print-card-value {
              font-size: 14px;
              color: #000000;
              font-weight: 400;
              line-height: 1.6;
            }
            .print-section-header {
              font-size: 16px;
              font-weight: 700;
              color: #000000;
              text-transform: uppercase;
              margin: 30px 0 20px 0;
              padding-bottom: 10px;
              border-bottom: 2px solid #000000;
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
          {/* En-tête moderne (visible uniquement à l'impression) */}
          <div className="hidden print:block print-modern-header">
            <img src={pcciLogo} alt="Logo" className="print-logo" />
            <div className="print-title">{ticket.title}</div>
            <div className="print-subtitle">Référence: {ticket.code} | {new Date(ticket.created_at).toLocaleDateString('fr-FR')}</div>
          </div>

          {/* En-tête normal (visible à l'écran) */}
          <CardHeader className="print:hidden">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{ticket.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Référence: {ticket.code}
                </p>
              </div>
              <Badge>{ticket.status}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="print:p-0 print-modern-body">
            {/* Section Informations Générales */}
            {(metadata.type || metadata.campagne) && (
              <>
                <div className="print-section-header">Informations Générales</div>
                <div className="print-cards-grid">
                  {metadata.type && (
                    <div className="print-card">
                      <div className="print-card-title">Type de fiche</div>
                      <div className="print-card-value">{metadata.type}</div>
                    </div>
                  )}
                  {metadata.campagne && (
                    <div className="print-card">
                      <div className="print-card-title">Campagne</div>
                      <div className="print-card-value">{metadata.campagne}</div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Section Identité */}
            {(metadata.prenom || metadata.nom || metadata.id_personnel || metadata.cni) && (
              <>
                <div className="print-section-header">Identité</div>
                <div className="print-cards-grid">
                  {metadata.prenom && (
                    <div className="print-card">
                      <div className="print-card-title">Prénom</div>
                      <div className="print-card-value">{metadata.prenom}</div>
                    </div>
                  )}
                  {metadata.nom && (
                    <div className="print-card">
                      <div className="print-card-title">Nom</div>
                      <div className="print-card-value">{metadata.nom}</div>
                    </div>
                  )}
                  {metadata.id_personnel && (
                    <div className="print-card">
                      <div className="print-card-title">ID Personnel</div>
                      <div className="print-card-value">{metadata.id_personnel}</div>
                    </div>
                  )}
                  {metadata.cni && (
                    <div className="print-card">
                      <div className="print-card-title">CNI</div>
                      <div className="print-card-value">{metadata.cni}</div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Adresse */}
            {metadata.demeurant && (
              <div className="print-cards-grid">
                <div className="print-card print-card-full">
                  <div className="print-card-title">Demeurant</div>
                  <div className="print-card-value">{metadata.demeurant}</div>
                </div>
              </div>
            )}

            {/* Section Détails */}
            {(metadata.type_mouvement || metadata.nom_machine || metadata.place || metadata.numero_sim || ticket.priority) && (
              <>
                <div className="print-section-header">Détails de la demande</div>
                <div className="print-cards-grid">
                  {metadata.type_mouvement && (
                    <div className="print-card">
                      <div className="print-card-title">Type de mouvement</div>
                      <div className="print-card-value">{metadata.type_mouvement}</div>
                    </div>
                  )}
                  {metadata.nom_machine && (
                    <div className="print-card">
                      <div className="print-card-title">Nom Machine</div>
                      <div className="print-card-value">{metadata.nom_machine}</div>
                    </div>
                  )}
                  {metadata.place && (
                    <div className="print-card">
                      <div className="print-card-title">Place</div>
                      <div className="print-card-value">{metadata.place}</div>
                    </div>
                  )}
                  {metadata.numero_sim && (
                    <div className="print-card">
                      <div className="print-card-title">Numéro SIM</div>
                      <div className="print-card-value">{metadata.numero_sim}</div>
                    </div>
                  )}
                  <div className="print-card">
                    <div className="print-card-title">Priorité</div>
                    <div className="print-card-value">{ticket.priority}</div>
                  </div>
                </div>
              </>
            )}

            {/* Section Dates */}
            {(metadata.date_depart || metadata.date_retour) && (
              <>
                <div className="print-section-header">Dates</div>
                <div className="print-cards-grid">
                  {metadata.date_depart && (
                    <div className="print-card">
                      <div className="print-card-title">Date de départ</div>
                      <div className="print-card-value">
                        {new Date(metadata.date_depart).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  )}
                  {metadata.date_retour && (
                    <div className="print-card">
                      <div className="print-card-title">Date de retour</div>
                      <div className="print-card-value">
                        {new Date(metadata.date_retour).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Section Description */}
            <div className="print-section-header">Description</div>
            <div className="print-cards-grid">
              <div className="print-card print-card-full">
                <div className="print-card-value" style={{ whiteSpace: 'pre-wrap' }}>
                  {ticket.description}
                </div>
              </div>
            </div>

            {/* Section Système */}
            <div className="print-section-header">Informations Système</div>
            <div className="print-cards-grid">
              <div className="print-card">
                <div className="print-card-title">Date de création</div>
                <div className="print-card-value">
                  {new Date(ticket.created_at).toLocaleDateString('fr-FR')} à {new Date(ticket.created_at).toLocaleTimeString('fr-FR')}
                </div>
              </div>
              <div className="print-card">
                <div className="print-card-title">Statut</div>
                <div className="print-card-value">{ticket.status}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
