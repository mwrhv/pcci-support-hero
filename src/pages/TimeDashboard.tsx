/**
 * Page TimeDashboard - Tableau de bord de gestion des temps
 * Vue d'ensemble des heures, compteurs, et statistiques
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import {
  BarChart3,
  Clock,
  Calendar,
  TrendingUp,
  Timer,
  Coffee,
  Award,
  Loader2,
  RefreshCw,
  CalendarDays,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";

// Import des fonctionnalités de sécurité
import { showError, safeAsync } from "@/utils/errorHandler";
import { escapeHtml } from "@/utils/sanitizer";

// Import des types et fonctions time management
import type { WorkSession, TimeBalance, LeaveRequest } from "@/types/time-management";
import {
  formatDuration,
  formatDate,
  calculateWeeklyReport,
  calculateMonthlyReport,
} from "@/utils/time-calculator";

interface DashboardStats {
  todayWorkMinutes: number;
  todayBreakMinutes: number;
  weekWorkMinutes: number;
  weekOvertimeMinutes: number;
  monthWorkMinutes: number;
  monthOvertimeMinutes: number;
}

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
}

export default function TimeDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    todayWorkMinutes: 0,
    todayBreakMinutes: 0,
    weekWorkMinutes: 0,
    weekOvertimeMinutes: 0,
    monthWorkMinutes: 0,
    monthOvertimeMinutes: 0,
  });
  const [balance, setBalance] = useState<TimeBalance | null>(null);
  const [recentSessions, setRecentSessions] = useState<WorkSession[]>([]);
  const [upcomingLeaves, setUpcomingLeaves] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  /**
   * Vérifier l'authentification et charger toutes les données
   */
  const checkAuthAndLoadData = async () => {
    // 1. Vérifier l'authentification
    const { data: user, error: userError } = await safeAsync(async () => {
      const result = await supabase.auth.getUser();
      if (result.error) throw result.error;
      return result.data.user;
    }, "Vérification authentification");

    if (userError || !user) {
      showError(userError || new Error("Utilisateur non authentifié"));
      navigate("/login");
      return;
    }

    // 2. Charger le profil
    const { data: profileData, error: profileError } = await safeAsync(async () => {
      const result = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single();
      if (result.error) throw result.error;
      return result.data;
    }, "Chargement profil");

    if (profileError || !profileData) {
      showError(profileError || new Error("Profil introuvable"));
      navigate("/dashboard");
      return;
    }

    setProfile(profileData);

    // 3. Charger toutes les données du tableau de bord
    await loadDashboardData(user.id);

    setLoading(false);
  };

  /**
   * Charger toutes les données du tableau de bord
   */
  const loadDashboardData = async (userId: string) => {
    // Définir les plages de dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Lundi
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Charger les sessions de travail
    const { data: sessions, error: sessionsError } = await safeAsync(async () => {
      const result = await supabase
        .from("work_sessions")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startOfMonth.toISOString().split('T')[0])
        .order("date", { ascending: false });
      
      if (result.error) throw result.error;
      return result.data as WorkSession[];
    }, "Chargement sessions");

    if (sessionsError || !sessions) {
      showError(sessionsError || new Error("Impossible de charger les sessions"));
      return;
    }

    // 2. Calculer les statistiques
    const todaySessions = sessions.filter(s => 
      s.date === today.toISOString().split('T')[0]
    );
    const weekSessions = sessions.filter(s => 
      new Date(s.date) >= startOfWeek
    );

    const newStats: DashboardStats = {
      todayWorkMinutes: todaySessions.reduce((sum, s) => sum + (s.total_work_minutes || 0), 0),
      todayBreakMinutes: todaySessions.reduce((sum, s) => sum + (s.break_duration_minutes || 0), 0),
      weekWorkMinutes: weekSessions.reduce((sum, s) => sum + (s.total_work_minutes || 0), 0),
      weekOvertimeMinutes: weekSessions.reduce((sum, s) => sum + (s.overtime_minutes || 0), 0),
      monthWorkMinutes: sessions.reduce((sum, s) => sum + (s.total_work_minutes || 0), 0),
      monthOvertimeMinutes: sessions.reduce((sum, s) => sum + (s.overtime_minutes || 0), 0),
    };

    setStats(newStats);
    setRecentSessions(sessions.slice(0, 7)); // 7 derniers jours

    // 3. Charger les compteurs
    const { data: balanceData, error: balanceError } = await safeAsync(async () => {
      const result = await supabase
        .from("time_balances")
        .select("*")
        .eq("user_id", userId)
        .eq("year", today.getFullYear())
        .maybeSingle();
      
      if (result.error) throw result.error;
      return result.data as TimeBalance | null;
    }, "Chargement compteurs");

    if (balanceError) {
      console.error("Erreur chargement compteurs:", balanceError);
    }

    setBalance(balanceData);

    // 4. Charger les absences à venir
    const { data: leaves, error: leavesError } = await safeAsync(async () => {
      const result = await supabase
        .from("leave_requests")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["pending", "approved"])
        .gte("start_date", today.toISOString().split('T')[0])
        .order("start_date", { ascending: true })
        .limit(5);
      
      if (result.error) throw result.error;
      return result.data as LeaveRequest[];
    }, "Chargement absences");

    if (leavesError) {
      console.error("Erreur chargement absences:", leavesError);
    }

    setUpcomingLeaves(leaves || []);
  };

  /**
   * Rafraîchir les données
   */
  const handleRefresh = async () => {
    if (!profile) return;
    setRefreshing(true);
    await loadDashboardData(profile.id);
    setRefreshing(false);
    toast.success("Données actualisées");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <BarChart3 className="inline-block mr-2 h-8 w-8" />
              Tableau de Bord - Gestion des Temps
            </h1>
            <p className="text-gray-600">
              Vue d'ensemble de vos heures et compteurs
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Today Work */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Aujourd'hui</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatDuration(stats.todayWorkMinutes)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Pause: {formatDuration(stats.todayBreakMinutes)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-600 opacity-75" />
              </div>
            </CardContent>
          </Card>

          {/* Week Work */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Cette Semaine</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatDuration(stats.weekWorkMinutes)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Heures sup: {formatDuration(stats.weekOvertimeMinutes)}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-green-600 opacity-75" />
              </div>
            </CardContent>
          </Card>

          {/* Month Work */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Ce Mois</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatDuration(stats.monthWorkMinutes)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Heures sup: {formatDuration(stats.monthOvertimeMinutes)}
                  </p>
                </div>
                <CalendarDays className="h-8 w-8 text-purple-600 opacity-75" />
              </div>
            </CardContent>
          </Card>

          {/* Leave Balance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Congés Restants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {balance?.paid_leave_remaining?.toFixed(1) || '0.0'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    jours disponibles
                  </p>
                </div>
                <Briefcase className="h-8 w-8 text-orange-600 opacity-75" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="counters">Compteurs</TabsTrigger>
            <TabsTrigger value="leaves">Absences à venir</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle>Dernières Sessions (7 jours)</CardTitle>
                <CardDescription>
                  Historique de vos sessions de travail récentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentSessions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Arrivée</TableHead>
                        <TableHead>Départ</TableHead>
                        <TableHead>Temps de travail</TableHead>
                        <TableHead>Pause</TableHead>
                        <TableHead>Heures sup.</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentSessions.map((session) => {
                        const statusColors: Record<string, string> = {
                          completed: 'bg-green-100 text-green-800',
                          in_progress: 'bg-blue-100 text-blue-800',
                          incomplete: 'bg-yellow-100 text-yellow-800',
                        };

                        const statusLabels: Record<string, string> = {
                          completed: 'Complète',
                          in_progress: 'En cours',
                          incomplete: 'Incomplète',
                        };

                        return (
                          <TableRow key={session.id}>
                            <TableCell className="font-medium">
                              {formatDate(new Date(session.date))}
                            </TableCell>
                            <TableCell>
                              {session.clock_in_time ? 
                                new Date(session.clock_in_time).toLocaleTimeString('fr-FR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                }) : '-'}
                            </TableCell>
                            <TableCell>
                              {session.clock_out_time ? 
                                new Date(session.clock_out_time).toLocaleTimeString('fr-FR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                }) : '-'}
                            </TableCell>
                            <TableCell className="font-semibold text-blue-600">
                              {formatDuration(session.total_work_minutes || 0)}
                            </TableCell>
                            <TableCell>
                              {formatDuration(session.break_duration_minutes || 0)}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {session.overtime_minutes && session.overtime_minutes > 0 
                                ? `+${formatDuration(session.overtime_minutes)}` 
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[session.status]}>
                                {statusLabels[session.status]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Timer className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune session récente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Counters Tab */}
          <TabsContent value="counters" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Paid Leave Counter */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Briefcase className="h-5 w-5 mr-2 text-orange-600" />
                    Congés Payés
                  </CardTitle>
                  <CardDescription>Année {new Date().getFullYear()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="font-medium">Total annuel</span>
                    <span className="text-lg font-bold text-orange-600">
                      {balance?.paid_leave_total?.toFixed(1) || '0.0'} jours
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Restants</span>
                    <span className="text-lg font-bold text-green-600">
                      {balance?.paid_leave_remaining?.toFixed(1) || '0.0'} jours
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Pris</span>
                    <span className="text-lg font-bold text-blue-600">
                      {((balance?.paid_leave_total || 0) - (balance?.paid_leave_remaining || 0)).toFixed(1)} jours
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* RTT Counter */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                    RTT (Réduction du Temps de Travail)
                  </CardTitle>
                  <CardDescription>Année {new Date().getFullYear()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium">Total annuel</span>
                    <span className="text-lg font-bold text-purple-600">
                      {balance?.rtt_total?.toFixed(1) || '0.0'} jours
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Restants</span>
                    <span className="text-lg font-bold text-green-600">
                      {balance?.rtt_remaining?.toFixed(1) || '0.0'} jours
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Pris</span>
                    <span className="text-lg font-bold text-blue-600">
                      {((balance?.rtt_total || 0) - (balance?.rtt_remaining || 0)).toFixed(1)} jours
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Overtime Counter */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    Heures Supplémentaires
                  </CardTitle>
                  <CardDescription>Année {new Date().getFullYear()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Accumulées</span>
                    <span className="text-lg font-bold text-green-600">
                      {formatDuration(balance?.overtime_accumulated_minutes || 0)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                    Les heures supplémentaires peuvent être récupérées ou payées selon les règles de l'entreprise.
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions Rapides</CardTitle>
                  <CardDescription>Raccourcis utiles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full" 
                    onClick={() => navigate("/time/clock")}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Aller au Pointage
                  </Button>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => navigate("/time/leaves")}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Demander une Absence
                  </Button>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => navigate("/time/reports")}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Voir les Rapports
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Leaves Tab */}
          <TabsContent value="leaves" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Absences à Venir</CardTitle>
                <CardDescription>
                  Vos prochaines absences approuvées ou en attente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingLeaves.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Début</TableHead>
                        <TableHead>Fin</TableHead>
                        <TableHead>Durée</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingLeaves.map((leave) => {
                        const typeLabels: Record<string, string> = {
                          paid_leave: 'Congé payé',
                          sick_leave: 'Maladie',
                          unpaid_leave: 'Sans solde',
                          rtt: 'RTT',
                          other: 'Autre',
                        };

                        const statusColors: Record<string, string> = {
                          pending: 'bg-yellow-100 text-yellow-800',
                          approved: 'bg-green-100 text-green-800',
                          rejected: 'bg-red-100 text-red-800',
                          cancelled: 'bg-gray-100 text-gray-800',
                        };

                        const statusLabels: Record<string, string> = {
                          pending: 'En attente',
                          approved: 'Approuvée',
                          rejected: 'Rejetée',
                          cancelled: 'Annulée',
                        };

                        // Calculate duration in days
                        const startDate = new Date(leave.start_date);
                        const endDate = new Date(leave.end_date);
                        const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                        return (
                          <TableRow key={leave.id}>
                            <TableCell className="font-medium">
                              {typeLabels[leave.leave_type]}
                            </TableCell>
                            <TableCell>
                              {formatDate(new Date(leave.start_date))}
                            </TableCell>
                            <TableCell>
                              {formatDate(new Date(leave.end_date))}
                            </TableCell>
                            <TableCell>
                              {durationDays} jour{durationDays > 1 ? 's' : ''}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[leave.status]}>
                                {statusLabels[leave.status]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune absence à venir</p>
                    <Button 
                      className="mt-4" 
                      variant="outline"
                      onClick={() => navigate("/time/leaves")}
                    >
                      Demander une Absence
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
