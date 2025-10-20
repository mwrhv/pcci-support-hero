import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Mail, HandshakeIcon, CheckCircle2, Paperclip, Download } from "lucide-react";
import { toast } from "sonner";
import { PrintPreview } from "@/components/PrintPreview";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [takingCharge, setTakingCharge] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
        }

        // Fetch ticket
        const { data, error } = await supabase
          .from("tickets")
          .select(`
            *,
            requester:profiles!tickets_requester_id_fkey(id, full_name, email),
            assignee:profiles!tickets_assignee_id_fkey(id, full_name, email, department)
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

    fetchData();
  }, [id, navigate]);

  const handlePrint = () => {
    setShowPrintPreview(true);
  };

  const handleShare = () => {
    const subject = `Fiche: ${ticket?.title || ""}`;
    const body = `Consultez cette fiche: ${window.location.href}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleTakeCharge = async () => {
    if (!currentUser || !ticket) return;

    setTakingCharge(true);
    try {
      const { error } = await supabase
        .from("tickets")
        .update({
          status: "In_Progress",
          assignee_id: currentUser.id,
        })
        .eq("id", ticket.id);

      if (error) throw error;

      // Get assignee profile for email notification
      const { data: assigneeProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", currentUser.id)
        .single();

      // Send email notifications
      try {
        // Notify the requester that ticket has been assigned
        if (ticket.requester?.email) {
          await supabase.functions.invoke("send-ticket-notification", {
            body: {
              type: "ticket_updated",
              ticketId: ticket.id,
              ticketCode: ticket.code,
              ticketTitle: ticket.title,
              recipientEmail: ticket.requester.email,
              recipientName: ticket.requester.full_name || "Utilisateur",
              additionalInfo: {
                assigneeName: assigneeProfile?.full_name || "Un conseiller",
                previousStatus: ticket.status,
                newStatus: "In_Progress",
              },
            },
          });
        }

        // Notify the assignee
        if (assigneeProfile?.email) {
          await supabase.functions.invoke("send-ticket-notification", {
            body: {
              type: "ticket_assigned",
              ticketId: ticket.id,
              ticketCode: ticket.code,
              ticketTitle: ticket.title,
              recipientEmail: assigneeProfile.email,
              recipientName: assigneeProfile.full_name || "Utilisateur",
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending email notifications:", emailError);
        // Don't fail the operation if email fails
      }

      toast.success("Ticket pris en charge avec succès");
      
      // Refresh ticket data
      const { data } = await supabase
        .from("tickets")
        .select(`
          *,
          requester:profiles!tickets_requester_id_fkey(id, full_name, email),
          assignee:profiles!tickets_assignee_id_fkey(id, full_name, email, department)
        `)
        .eq("id", ticket.id)
        .single();

      if (data) {
        setTicket(data);
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Erreur lors de la prise en charge du ticket");
    } finally {
      setTakingCharge(false);
    }
  };

  const handleResolve = async () => {
    if (!ticket) return;

    setResolving(true);
    try {
      const { error } = await supabase
        .from("tickets")
        .update({
          status: "Resolved",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);

      if (error) throw error;

      // Send email notification to requester
      if (ticket.requester?.email) {
        try {
          await supabase.functions.invoke("send-ticket-notification", {
            body: {
              type: "ticket_resolved",
              ticketId: ticket.id,
              ticketCode: ticket.code,
              ticketTitle: ticket.title,
              recipientEmail: ticket.requester.email,
              recipientName: ticket.requester.full_name || "Utilisateur",
            },
          });
        } catch (emailError) {
          console.error("Error sending email notification:", emailError);
          // Don't fail the operation if email fails
        }
      }

      toast.success("Ticket marqué comme résolu");
      
      // Refresh ticket data
      const { data } = await supabase
        .from("tickets")
        .select(`
          *,
          requester:profiles!tickets_requester_id_fkey(id, full_name, email),
          assignee:profiles!tickets_assignee_id_fkey(id, full_name, email, department)
        `)
        .eq("id", ticket.id)
        .single();

      if (data) {
        setTicket(data);
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Erreur lors de la résolution du ticket");
    } finally {
      setResolving(false);
    }
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
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          
          <div className="flex gap-2">
            {ticket.status === "New" && !ticket.assignee_id && currentUser && currentUser.id !== ticket.requester_id && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleTakeCharge}
                disabled={takingCharge}
              >
                <HandshakeIcon className="mr-2 h-4 w-4" />
                {takingCharge ? "Prise en charge..." : "Prendre en charge"}
              </Button>
            )}
            {ticket.status === "In_Progress" && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleResolve}
                disabled={resolving}
                className="bg-success hover:bg-success/90"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {resolving ? "Résolution..." : "Problème résolu"}
              </Button>
            )}
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
                <p className="text-sm text-muted-foreground mt-2">
                  Référence: {ticket.code}
                </p>
              </div>
              <Badge>{ticket.status}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Informations du créateur */}
            {ticket.requester && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Créé par</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Nom complet</p>
                    <p className="font-medium">{ticket.requester.full_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{ticket.requester.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">ID Utilisateur</p>
                    <p className="font-medium text-xs break-all">{ticket.requester.id}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Informations du conseiller */}
            {(metadata.utilisateur || metadata.email || metadata.departement) && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Informations du conseiller</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {metadata.utilisateur && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Nom complet</p>
                      <p className="font-medium">{metadata.utilisateur}</p>
                    </div>
                  )}
                  {metadata.email && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{metadata.email}</p>
                    </div>
                  )}
                  {metadata.departement && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Département</p>
                      <p className="font-medium">{metadata.departement}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Informations principales */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Informations principales</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {metadata.type && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{metadata.type}</p>
                  </div>
                )}
                {metadata.campagne && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Campagne</p>
                    <p className="font-medium">{metadata.campagne}</p>
                  </div>
                )}
                {metadata.fonction && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Fonction</p>
                    <p className="font-medium">{metadata.fonction}</p>
                  </div>
                )}
                {metadata.type_mouvement && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Type de mouvement</p>
                    <p className="font-medium">{metadata.type_mouvement}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <p className="font-medium">{ticket.status}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Priorité</p>
                  <p className="font-medium">{ticket.priority}</p>
                </div>
              </div>
            </div>

            {/* Informations personnelles */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Informations personnelles</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {metadata.prenom && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Prénom</p>
                    <p className="font-medium">{metadata.prenom}</p>
                  </div>
                )}
                {metadata.nom && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Nom</p>
                    <p className="font-medium">{metadata.nom}</p>
                  </div>
                )}
                {metadata.id_personnel && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">ID Personnel</p>
                    <p className="font-medium">{metadata.id_personnel}</p>
                  </div>
                )}
                {metadata.cni && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">CNI</p>
                    <p className="font-medium">{metadata.cni}</p>
                  </div>
                )}
                {metadata.telephone && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{metadata.telephone}</p>
                  </div>
                )}
              </div>
              {metadata.demeurant && (
                <div className="space-y-1 mt-4">
                  <p className="text-sm text-muted-foreground">Demeurant</p>
                  <p className="font-medium">{metadata.demeurant}</p>
                </div>
              )}
            </div>

            {/* Informations matériel */}
            {(metadata.nom_machine || metadata.place || metadata.numero_sim) && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Informations matériel</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {metadata.nom_machine && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Nom Machine</p>
                      <p className="font-medium">{metadata.nom_machine}</p>
                    </div>
                  )}
                  {metadata.place && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Place</p>
                      <p className="font-medium">{metadata.place}</p>
                    </div>
                  )}
                  {metadata.numero_sim && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Numéro SIM</p>
                      <p className="font-medium">{metadata.numero_sim}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Informations de démission */}
            {(metadata.date_demission || metadata.motif) && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Informations de démission</h3>
                <div className="space-y-4">
                  {metadata.date_demission && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Date de démission</p>
                      <p className="font-medium">
                        {new Date(metadata.date_demission).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  )}
                  {metadata.motif && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Motif</p>
                      <p className="font-medium whitespace-pre-wrap">{metadata.motif}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fichiers joints */}
            {metadata.attachments && metadata.attachments.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Fichiers joints ({metadata.attachments.length})
                </h3>
                <div className="grid gap-2">
                  {metadata.attachments.map((attachment: any, index: number) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Paperclip className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{attachment.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(attachment.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            const { data, error } = await supabase.storage
                              .from("ticket-attachments")
                              .createSignedUrl(attachment.path, 60);
                            
                            if (error) throw error;
                            
                            window.open(data.signedUrl, '_blank');
                          } catch (error) {
                            console.error("Error downloading file:", error);
                            toast.error("Erreur lors du téléchargement du fichier");
                          }
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Description</h3>
              <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">
                {ticket.description}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <PrintPreview
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        ficheData={{
          code: ticket.code,
          title: ticket.title,
          metadata: ticket.metadata,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          assignee: ticket.assignee,
        }}
      />
    </div>
  );
}
