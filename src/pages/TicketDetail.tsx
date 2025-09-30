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
              position: relative;
            }
            .print-container {
              page-break-inside: avoid;
              break-inside: avoid;
              position: relative;
            }
            .print-watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 120px;
              font-weight: 100;
              color: #f3f4f6;
              opacity: 0.3;
              z-index: 0;
              pointer-events: none;
            }
            .print-official-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding: 30px 40px;
              border-bottom: 4px solid #1e40af;
              background: linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%);
              position: relative;
              z-index: 1;
            }
            .print-logo-section {
              flex: 1;
            }
            .print-logo {
              max-height: 90px;
              width: auto;
            }
            .print-ref-section {
              text-align: right;
              flex: 1;
            }
            .print-ref-label {
              font-size: 11px;
              text-transform: uppercase;
              color: #6b7280;
              font-weight: 600;
              letter-spacing: 1px;
            }
            .print-ref-number {
              font-size: 28px;
              font-weight: 700;
              color: #1e40af;
              margin-top: 5px;
              font-family: monospace;
            }
            .print-ref-date {
              font-size: 11px;
              color: #6b7280;
              margin-top: 8px;
            }
            .print-official-body {
              padding: 40px 50px;
              position: relative;
              z-index: 1;
            }
            .print-section {
              margin-bottom: 35px;
              page-break-inside: avoid;
            }
            .print-section-title {
              font-size: 16px;
              font-weight: 700;
              color: #1e40af;
              text-transform: uppercase;
              letter-spacing: 1px;
              border-left: 5px solid #1e40af;
              padding-left: 15px;
              margin-bottom: 20px;
            }
            .print-field-row {
              display: grid;
              grid-template-columns: 200px 1fr;
              gap: 20px;
              padding: 12px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .print-field-label {
              font-weight: 600;
              color: #374151;
              font-size: 13px;
            }
            .print-field-value {
              color: #1f2937;
              font-size: 13px;
              line-height: 1.6;
            }
            .print-official-footer {
              padding: 25px 40px;
              border-top: 4px solid #1e40af;
              background: #f9fafb;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10px;
              color: #6b7280;
              position: relative;
              z-index: 1;
            }
            .print-footer-left {
              text-align: left;
            }
            .print-footer-right {
              text-align: right;
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
          {/* Filigrane (visible uniquement à l'impression) */}
          <div className="hidden print:block print-watermark">CONFIDENTIEL</div>

          {/* En-tête officiel (visible uniquement à l'impression) */}
          <div className="hidden print:block print-official-header">
            <div className="print-logo-section">
              <img src={pcciLogo} alt="Logo" className="print-logo" />
            </div>
            <div className="print-ref-section">
              <div className="print-ref-label">Référence</div>
              <div className="print-ref-number">{ticket.code}</div>
              <div className="print-ref-date">
                Émis le {new Date(ticket.created_at).toLocaleDateString('fr-FR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </div>
            </div>
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
          
          <CardContent className="print:p-0 print-official-body">
            {/* Section Objet */}
            <div className="print-section">
              <div className="print-section-title">Objet de la demande</div>
              <div className="print-field-row">
                <div className="print-field-label">Titre</div>
                <div className="print-field-value font-semibold">{ticket.title}</div>
              </div>
              {metadata.type && (
                <div className="print-field-row">
                  <div className="print-field-label">Type de fiche</div>
                  <div className="print-field-value">{metadata.type}</div>
                </div>
              )}
              {metadata.campagne && (
                <div className="print-field-row">
                  <div className="print-field-label">Campagne</div>
                  <div className="print-field-value">{metadata.campagne}</div>
                </div>
              )}
            </div>

            {/* Section Informations du demandeur */}
            {(metadata.prenom || metadata.nom || metadata.id_personnel || metadata.cni || metadata.demeurant) && (
              <div className="print-section">
                <div className="print-section-title">Informations du demandeur</div>
                {metadata.prenom && (
                  <div className="print-field-row">
                    <div className="print-field-label">Prénom</div>
                    <div className="print-field-value">{metadata.prenom}</div>
                  </div>
                )}
                {metadata.nom && (
                  <div className="print-field-row">
                    <div className="print-field-label">Nom</div>
                    <div className="print-field-value">{metadata.nom}</div>
                  </div>
                )}
                {metadata.id_personnel && (
                  <div className="print-field-row">
                    <div className="print-field-label">Identifiant Personnel</div>
                    <div className="print-field-value">{metadata.id_personnel}</div>
                  </div>
                )}
                {metadata.cni && (
                  <div className="print-field-row">
                    <div className="print-field-label">Carte Nationale d'Identité</div>
                    <div className="print-field-value">{metadata.cni}</div>
                  </div>
                )}
                {metadata.demeurant && (
                  <div className="print-field-row">
                    <div className="print-field-label">Adresse</div>
                    <div className="print-field-value">{metadata.demeurant}</div>
                  </div>
                )}
              </div>
            )}

            {/* Section Détails de la demande */}
            <div className="print-section">
              <div className="print-section-title">Détails de la demande</div>
              {metadata.type_mouvement && (
                <div className="print-field-row">
                  <div className="print-field-label">Type de mouvement</div>
                  <div className="print-field-value">{metadata.type_mouvement}</div>
                </div>
              )}
              {metadata.nom_machine && (
                <div className="print-field-row">
                  <div className="print-field-label">Nom de la machine</div>
                  <div className="print-field-value">{metadata.nom_machine}</div>
                </div>
              )}
              {metadata.place && (
                <div className="print-field-row">
                  <div className="print-field-label">Emplacement</div>
                  <div className="print-field-value">{metadata.place}</div>
                </div>
              )}
              {metadata.numero_sim && (
                <div className="print-field-row">
                  <div className="print-field-label">Numéro SIM</div>
                  <div className="print-field-value">{metadata.numero_sim}</div>
                </div>
              )}
              <div className="print-field-row">
                <div className="print-field-label">Niveau de priorité</div>
                <div className="print-field-value">{ticket.priority}</div>
              </div>
            </div>

            {/* Section Calendrier */}
            {(metadata.date_depart || metadata.date_retour) && (
              <div className="print-section">
                <div className="print-section-title">Calendrier</div>
                {metadata.date_depart && (
                  <div className="print-field-row">
                    <div className="print-field-label">Date de départ</div>
                    <div className="print-field-value">
                      {new Date(metadata.date_depart).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </div>
                  </div>
                )}
                {metadata.date_retour && (
                  <div className="print-field-row">
                    <div className="print-field-label">Date de retour prévue</div>
                    <div className="print-field-value">
                      {new Date(metadata.date_retour).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section Description */}
            <div className="print-section">
              <div className="print-section-title">Description détaillée</div>
              <div className="print-field-value" style={{ whiteSpace: 'pre-wrap', paddingTop: '10px' }}>
                {ticket.description}
              </div>
            </div>
          </CardContent>

          {/* Pied de page officiel (visible uniquement à l'impression) */}
          <div className="hidden print:block print-official-footer">
            <div className="print-footer-left">
              <div style={{ fontWeight: '600', marginBottom: '3px' }}>Statut: {ticket.status}</div>
              <div>Document généré automatiquement le {new Date().toLocaleDateString('fr-FR')}</div>
            </div>
            <div className="print-footer-right">
              <div style={{ fontWeight: '600', marginBottom: '3px' }}>PCCI</div>
              <div>Ce document est confidentiel</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
