import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Plus, Search, Filter } from "lucide-react";
import { toast } from "sonner";

export default function TicketsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get("overdue") === "true");

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter, overdueOnly]);

  const fetchTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("tickets")
        .select(`
          *,
          requester:profiles!tickets_requester_id_fkey(full_name),
          assignee:profiles!tickets_assignee_id_fkey(full_name),
          category:categories(name)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }

      if (priorityFilter !== "all") {
        query = query.eq("priority", priorityFilter as any);
      }

      if (overdueOnly) {
        query = query
          .lt("due_at", new Date().toISOString())
          .not("status", "in", '("Resolved","Closed","Canceled")');
      }

      const { data, error } = await query;

      if (error) throw error;
      setTickets(data || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des tickets");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "bg-accent text-accent-foreground";
      case "High":
        return "bg-warning text-warning-foreground";
      case "Medium":
        return "bg-primary text-primary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New":
        return "bg-primary text-primary-foreground";
      case "In_Progress":
        return "bg-warning text-warning-foreground";
      case "Resolved":
        return "bg-success text-success-foreground";
      case "Closed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Mes Tickets</h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos demandes d'assistance
            </p>
          </div>
          <Button onClick={() => navigate("/tickets/new")} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau ticket
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par code ou titre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="New">Nouveau</SelectItem>
                  <SelectItem value="Triaged">Trié</SelectItem>
                  <SelectItem value="In_Progress">En cours</SelectItem>
                  <SelectItem value="Pending_User">En attente utilisateur</SelectItem>
                  <SelectItem value="Resolved">Résolu</SelectItem>
                  <SelectItem value="Closed">Fermé</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Priorité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les priorités</SelectItem>
                  <SelectItem value="Low">Basse</SelectItem>
                  <SelectItem value="Medium">Moyenne</SelectItem>
                  <SelectItem value="High">Haute</SelectItem>
                  <SelectItem value="Critical">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tickets List */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filteredTickets.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                  Aucun ticket trouvé
                </p>
              ) : (
                filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-6 hover:bg-accent/5 cursor-pointer transition-colors"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <p className="text-lg font-semibold">{ticket.title}</p>
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-muted-foreground">{ticket.code}</p>
                          <Badge className={getPriorityColor(ticket.priority)} variant="secondary">
                            {ticket.priority}
                          </Badge>
                          <Badge className={getStatusColor(ticket.status)} variant="outline">
                            {ticket.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Catégorie: {ticket.category?.name || "Non classé"}</span>
                          <span>•</span>
                          <span>Assigné à: {ticket.assignee?.full_name || "Non assigné"}</span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>Créé le {new Date(ticket.created_at).toLocaleDateString("fr-FR")}</p>
                        {ticket.due_at && (
                          <p className={new Date(ticket.due_at) < new Date() ? "text-accent font-semibold" : ""}>
                            Échéance: {new Date(ticket.due_at).toLocaleDateString("fr-FR")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
