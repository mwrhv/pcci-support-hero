import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, Ticket, Activity, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Statistics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTickets: 0,
    ticketsByStatus: [] as any[],
    ticketsByPriority: [] as any[],
    ticketsByCategory: [] as any[],
    recentActivities: [] as any[],
    ticketsOverTime: [] as any[],
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      // Fetch users statistics
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, is_active");
      
      if (profilesError) throw profilesError;

      const totalUsers = profiles?.length || 0;
      const activeUsers = profiles?.filter(p => p.is_active).length || 0;

      // Fetch tickets statistics
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select("id, status, priority, category_id, created_at");
      
      if (ticketsError) throw ticketsError;

      const totalTickets = tickets?.length || 0;

      // Group tickets by status
      const statusGroups = tickets?.reduce((acc: any, ticket: any) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {});

      const ticketsByStatus = Object.entries(statusGroups || {}).map(([name, value]) => ({
        name,
        value,
      }));

      // Group tickets by priority
      const priorityGroups = tickets?.reduce((acc: any, ticket: any) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {});

      const ticketsByPriority = Object.entries(priorityGroups || {}).map(([name, value]) => ({
        name,
        value,
      }));

      // Fetch categories
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name");

      // Group tickets by category
      const categoryGroups = tickets?.reduce((acc: any, ticket: any) => {
        const category = categories?.find(c => c.id === ticket.category_id);
        const categoryName = category?.name || "Non catégorisé";
        acc[categoryName] = (acc[categoryName] || 0) + 1;
        return acc;
      }, {});

      const ticketsByCategory = Object.entries(categoryGroups || {}).map(([name, value]) => ({
        name,
        value,
      }));

      // Tickets over time (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const ticketsOverTime = last7Days.map(date => {
        const count = tickets?.filter(t => 
          t.created_at?.startsWith(date)
        ).length || 0;
        return {
          date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          tickets: count,
        };
      });

      // Fetch recent audit logs
      const { data: auditLogs, error: auditError } = await supabase
        .from("audit_logs")
        .select("id, action, entity_type, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (auditError) throw auditError;

      setStats({
        totalUsers,
        activeUsers,
        totalTickets,
        ticketsByStatus,
        ticketsByPriority,
        ticketsByCategory,
        recentActivities: auditLogs || [],
        ticketsOverTime,
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analyse statistique</h1>
          <p className="text-muted-foreground">Tableau de bord de performance de l'application</p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeUsers} actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTickets}</div>
              <p className="text-xs text-muted-foreground">
                Tous les statuts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activités récentes</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentActivities.length}</div>
              <p className="text-xs text-muted-foreground">
                Dernières actions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux d'activité</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Utilisateurs actifs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tickets par statut</CardTitle>
              <CardDescription>Répartition des tickets selon leur statut</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.ticketsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {stats.ticketsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tickets par priorité</CardTitle>
              <CardDescription>Distribution selon le niveau de priorité</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.ticketsByPriority}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Évolution des tickets</CardTitle>
              <CardDescription>Tickets créés au cours des 7 derniers jours</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.ticketsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="tickets" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tickets par catégorie</CardTitle>
              <CardDescription>Répartition selon les catégories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.ticketsByCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Activités récentes</CardTitle>
            <CardDescription>Les 10 dernières actions dans l'application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.entity_type}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(activity.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Statistics;