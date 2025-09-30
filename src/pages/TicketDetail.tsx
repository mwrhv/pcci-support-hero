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
            .print-table {
              width: 100%;
              border-collapse: collapse;
            }
            .print-table th,
            .print-table td {
              border: 1px solid #e5e7eb;
              padding: 8px 12px;
              text-align: left;
            }
            .print-table th {
              background-color: #f9fafb;
              font-weight: 600;
              width: 35%;
            }
            .print-table td {
              background-color: white;
            }
            .print-header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #e5e7eb;
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
          <CardHeader className="print-header">
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
          
          <CardContent className="print:p-0">
            <table className="w-full border-collapse print-table">
              <tbody>
                {metadata.type && (
                  <tr>
                    <th className="bg-muted p-3 text-left font-semibold border print:bg-gray-100">
                      Type de fiche
                    </th>
                    <td className="p-3 border">{metadata.type}</td>
                  </tr>
                )}

                {metadata.prenom && (
                  <tr>
                    <th className="bg-muted p-3 text-left font-semibold border print:bg-gray-100">
                      Prénom
                    </th>
                    <td className="p-3 border">{metadata.prenom}</td>
                  </tr>
                )}

                {metadata.nom && (
                  <tr>
                    <th className="bg-muted p-3 text-left font-semibold border print:bg-gray-100">
                      Nom
                    </th>
                    <td className="p-3 border">{metadata.nom}</td>
                  </tr>
                )}

                {metadata.id_personnel && (
                  <tr>
                    <th className="bg-muted p-3 text-left font-semibold border print:bg-gray-100">
                      ID Personnel
                    </th>
                    <td className="p-3 border">{metadata.id_personnel}</td>
                  </tr>
                )}

                {metadata.cni && (
                  <tr>
                    <th className="bg-muted p-3 text-left font-semibold border print:bg-gray-100">
                      CNI
                    </th>
                    <td className="p-3 border">{metadata.cni}</td>
                  </tr>
                )}

                {metadata.demeurant && (
                  <tr>
                    <th className="bg-muted p-3 text-left font-semibold border print:bg-gray-100">
                      Demeurant
                    </th>
                    <td className="p-3 border">{metadata.demeurant}</td>
                  </tr>
                )}

                {metadata.campagne && (
                  <tr>
                    <th className="bg-muted p-3 text-left font-semibold border print:bg-gray-100">
                      Campagne
                    </th>
                    <td className="p-3 border">{metadata.campagne}</td>
                  </tr>
                )}

                {metadata.type_mouvement && (
                  <tr>
                    <th className="bg-muted p-3 text-left font-semibold border print:bg-gray-100">
                      Type de mouvement
                    </th>
                    <td className="p-3 border">{metadata.type_mouvement}</td>
                  </tr>
                )}

                {metadata.nom_machine && (
                  <tr>
                    <th className="bg-muted p-3 text-left font-semibold border print:bg-gray-100">
                      Nom Machine
                    </th>
                    <td className="p-3 border">{metadata.nom_machine}</td>
                  </tr>
                )}

                {metadata.place && (
                  <tr>
                    <th className="bg-muted p-3 text-left font-semibold border print:bg-gray-100">
                      Place
                    </th>
                    <td className="p-3 border">{metadata.place}</td>
                  </tr>
                )}

                {metadata.numero_sim && (
                  <tr>
                    <th className="bg-muted p-3 text-left font-semibold border print:bg-gray-100">
                      Numéro SIM
                    </th>
                    <td className="p-3 border">{metadata.numero_sim}</td>
                  </tr>
                )}

                {metadata.date_depart && (
                  <tr>
                    <th className="bg-muted p-3 text-left font-semibold border print:bg-gray-100">
                      Date de départ
                    </th>
                    <td className="p-3 border">
                      {new Date(metadata.date_depart).toLocaleDateString()}
                    </td>
                  </tr>
                )}

                {metadata.date_retour && (
                  <tr>
                    <th className="bg-muted p-3 text-left font-semibold border print:bg-gray-100">
                      Date de retour
                    </th>
                    <td className="p-3 border">
                      {new Date(metadata.date_retour).toLocaleDateString()}
                    </td>
                  </tr>
                )}

                <tr>
                  <th className="bg-muted p-3 text-left font-semibold border print:bg-gray-100">
                    Description
                  </th>
                  <td className="p-3 border whitespace-pre-wrap">{ticket.description}</td>
                </tr>

                <tr>
                  <th className="bg-muted p-3 text-left font-semibold border print:bg-gray-100">
                    Date de création
                  </th>
                  <td className="p-3 border">
                    {new Date(ticket.created_at).toLocaleDateString()} à {new Date(ticket.created_at).toLocaleTimeString()}
                  </td>
                </tr>

                <tr>
                  <th className="bg-muted p-3 text-left font-semibold border print:bg-gray-100">
                    Priorité
                  </th>
                  <td className="p-3 border">{ticket.priority}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
