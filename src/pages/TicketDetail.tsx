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
            }
            .print-logo-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px;
              border-bottom: 3px solid #1e40af;
              margin-bottom: 30px;
            }
            .print-logo {
              max-height: 80px;
              width: auto;
            }
            .print-info-box {
              text-align: right;
            }
            .print-section {
              margin-bottom: 25px;
            }
            .print-section-title {
              font-size: 14px;
              font-weight: 700;
              color: #1e40af;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 8px;
              margin-bottom: 15px;
              text-transform: uppercase;
            }
            .print-field {
              display: flex;
              margin-bottom: 12px;
              padding: 8px;
            }
            .print-field:nth-child(even) {
              background-color: #f9fafb;
            }
            .print-field-label {
              font-weight: 600;
              width: 40%;
              color: #374151;
            }
            .print-field-value {
              width: 60%;
              color: #1f2937;
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
          {/* En-tête avec logo (visible uniquement à l'impression) */}
          <div className="hidden print:block print-logo-header">
            <img src={pcciLogo} alt="Logo" className="print-logo" />
            <div className="print-info-box">
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>{ticket.title}</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Code: {ticket.code}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>
                {new Date(ticket.created_at).toLocaleDateString()}
              </div>
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
          
          <CardContent className="print:p-5">
            {/* Informations personnelles */}
            {(metadata.prenom || metadata.nom || metadata.id_personnel || metadata.cni || metadata.demeurant) && (
              <div className="print-section">
                <div className="print-section-title">Informations Personnelles</div>
                {metadata.prenom && (
                  <div className="print-field">
                    <div className="print-field-label">Prénom</div>
                    <div className="print-field-value">{metadata.prenom}</div>
                  </div>
                )}
                {metadata.nom && (
                  <div className="print-field">
                    <div className="print-field-label">Nom</div>
                    <div className="print-field-value">{metadata.nom}</div>
                  </div>
                )}
                {metadata.id_personnel && (
                  <div className="print-field">
                    <div className="print-field-label">ID Personnel</div>
                    <div className="print-field-value">{metadata.id_personnel}</div>
                  </div>
                )}
                {metadata.cni && (
                  <div className="print-field">
                    <div className="print-field-label">CNI</div>
                    <div className="print-field-value">{metadata.cni}</div>
                  </div>
                )}
                {metadata.demeurant && (
                  <div className="print-field">
                    <div className="print-field-label">Demeurant</div>
                    <div className="print-field-value">{metadata.demeurant}</div>
                  </div>
                )}
              </div>
            )}

            {/* Détails de la demande */}
            <div className="print-section">
              <div className="print-section-title">Détails de la Demande</div>
              {metadata.type && (
                <div className="print-field">
                  <div className="print-field-label">Type de fiche</div>
                  <div className="print-field-value">{metadata.type}</div>
                </div>
              )}
              {metadata.campagne && (
                <div className="print-field">
                  <div className="print-field-label">Campagne</div>
                  <div className="print-field-value">{metadata.campagne}</div>
                </div>
              )}
              {metadata.type_mouvement && (
                <div className="print-field">
                  <div className="print-field-label">Type de mouvement</div>
                  <div className="print-field-value">{metadata.type_mouvement}</div>
                </div>
              )}
              <div className="print-field">
                <div className="print-field-label">Description</div>
                <div className="print-field-value" style={{ whiteSpace: 'pre-wrap' }}>{ticket.description}</div>
              </div>
              <div className="print-field">
                <div className="print-field-label">Priorité</div>
                <div className="print-field-value">{ticket.priority}</div>
              </div>
            </div>

            {/* Équipement et matériel */}
            {(metadata.nom_machine || metadata.place || metadata.numero_sim) && (
              <div className="print-section">
                <div className="print-section-title">Équipement et Matériel</div>
                {metadata.nom_machine && (
                  <div className="print-field">
                    <div className="print-field-label">Nom Machine</div>
                    <div className="print-field-value">{metadata.nom_machine}</div>
                  </div>
                )}
                {metadata.place && (
                  <div className="print-field">
                    <div className="print-field-label">Place</div>
                    <div className="print-field-value">{metadata.place}</div>
                  </div>
                )}
                {metadata.numero_sim && (
                  <div className="print-field">
                    <div className="print-field-label">Numéro SIM</div>
                    <div className="print-field-value">{metadata.numero_sim}</div>
                  </div>
                )}
              </div>
            )}

            {/* Dates */}
            {(metadata.date_depart || metadata.date_retour) && (
              <div className="print-section">
                <div className="print-section-title">Dates</div>
                {metadata.date_depart && (
                  <div className="print-field">
                    <div className="print-field-label">Date de départ</div>
                    <div className="print-field-value">
                      {new Date(metadata.date_depart).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {metadata.date_retour && (
                  <div className="print-field">
                    <div className="print-field-label">Date de retour</div>
                    <div className="print-field-value">
                      {new Date(metadata.date_retour).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Informations système */}
            <div className="print-section">
              <div className="print-section-title">Informations Système</div>
              <div className="print-field">
                <div className="print-field-label">Date de création</div>
                <div className="print-field-value">
                  {new Date(ticket.created_at).toLocaleDateString()} à {new Date(ticket.created_at).toLocaleTimeString()}
                </div>
              </div>
              <div className="print-field print:hidden">
                <div className="print-field-label">Statut</div>
                <div className="print-field-value">{ticket.status}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
