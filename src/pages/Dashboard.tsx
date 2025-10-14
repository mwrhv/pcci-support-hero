import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Plus, Ticket, Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    myTickets: 0,
    newTickets: 0,
    inProgress: 0,
    resolved: 0,
    overdue: 0,
  });
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      // Fetch metrics
      const { count: myTicketsCount } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .or(`requester_id.eq.${user.id},assignee_id.eq.${user.id}`);

      const { count: newCount } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "New");

      const { count: inProgressCount } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "In_Progress");

      const { count: resolvedCount } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "Resolved");

      const { count: overdueCount } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .lt("due_at", new Date().toISOString())
        .not("status", "in", '("Resolved","Closed","Canceled")');

      setMetrics({
        myTickets: myTicketsCount || 0,
        newTickets: newCount || 0,
        inProgress: inProgressCount || 0,
        resolved: resolvedCount || 0,
        overdue: overdueCount || 0,
      });

      // Fetch recent tickets
      const { data: ticketsData, error } = await supabase
        .from("tickets")
        .select(`
          *,
          requester:profiles!tickets_requester_id_fkey(full_name),
          assignee:profiles!tickets_assignee_id_fkey(full_name),
          category:categories(name)
        `)
        .or(`requester_id.eq.${user.id},assignee_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentTickets(ticketsData || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des données");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-muted-foreground">Chargement du tableau de bord...</p>
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
            <h1 className="text-3xl font-bold">Tableau de bord</h1>
            <p className="text-muted-foreground mt-1">
              Bienvenue, {profile?.full_name}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => navigate("/fiches")} variant="outline">
              Répertoire des Fiches
            </Button>
            <Button onClick={() => navigate("/fiche-retour-materiel")} variant="outline">
              Retour Matériel
            </Button>
            <Button onClick={() => navigate("/fiche-depart-teletravail")} variant="outline">
              Départ Télétravail
            </Button>
            <Button onClick={() => navigate("/fiche-demission")} variant="outline">
              Démission
            </Button>
            <Button onClick={() => navigate("/tickets/new")} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau ticket
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/tickets")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Mes Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.myTickets}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/tickets?status=New")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Nouveaux</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.newTickets}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/tickets?status=In_Progress")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">En cours</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.inProgress}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/tickets?status=Resolved")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Résolus</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.resolved}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-accent" onClick={() => navigate("/tickets?overdue=true")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">En retard SLA</CardTitle>
              <XCircle className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{metrics.overdue}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets récents</CardTitle>
            <CardDescription>Vos 5 derniers tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTickets.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun ticket pour le moment
                </p>
              ) : (
                recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 cursor-pointer transition-colors"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{ticket.code}</p>
                        <Badge className={getPriorityColor(ticket.priority)} variant="secondary">
                          {ticket.priority}
                        </Badge>
                        <Badge className={getStatusColor(ticket.status)} variant="outline">
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Catégorie: {ticket.category?.name || "Non classé"}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Assigné à: {ticket.assignee?.full_name || "Non assigné"}</p>
                      <p className="text-xs">
                        {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                      </p>
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
