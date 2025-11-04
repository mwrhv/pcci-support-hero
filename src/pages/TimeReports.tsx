/**
 * Page TimeReports - Rapports et exports de temps
 * Génération de rapports mensuels, exports CSV, statistiques
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  FileText,
  Download,
  Calendar,
  BarChart3,
  Users,
  Loader2,
  TrendingUp,
  Clock,
  FileSpreadsheet,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";

// Import des fonctionnalités de sécurité
import { showError, safeAsync } from "@/utils/errorHandler";
import { escapeHtml } from "@/utils/sanitizer";

// Import des types
import type { WorkSession, MonthlyTimeReport } from "@/types/time-management";
import { 
  formatDuration, 
  formatDate,
  calculateMonthlyReport,
} from "@/utils/time-calculator";

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
}

interface MonthlyReportData {
  userId: string;
  userName: string;
  totalWorkMinutes: number;
  totalOvertimeMinutes: number;
  completedSessions: number;
  incompleteSessions: number;
  averageDailyMinutes: number;
}

export default function TimeReports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSupervisor, setIsSupervisor] = useState(false);
  
  // Report state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [mySessions, setMySessions] = useState<WorkSession[]>([]);
  const [myMonthlyReport, setMyMonthlyReport] = useState<MonthlyReportData | null>(null);
  const [teamReports, setTeamReports] = useState<MonthlyReportData[]>([]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    if (profile) {
      loadReportData();
    }
  }, [selectedYear, selectedMonth, profile]);

  /**
   * Vérifier l'authentification et charger les données
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

    // 3. Vérifier si superviseur ou admin
    const { data: roles } = await safeAsync(async () => {
      const result = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["supervisor", "admin"]);
      
      if (result.error) throw result.error;
      return result.data;
    }, "Vérification rôle");

    setIsSupervisor(!!roles && roles.length > 0);
    setLoading(false);
  };

  /**
   * Charger les données de rapport pour le mois sélectionné
   */
  const loadReportData = async () => {
    if (!profile) return;

    setGenerating(true);

    try {
      // Calculer les dates de début et fin du mois
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Charger mes sessions
      await loadMySessions(profile.id, startDateStr, endDateStr);

      // Charger les rapports de l'équipe si superviseur
      if (isSupervisor) {
        await loadTeamReports(startDateStr, endDateStr);
      }
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Charger mes sessions pour le mois
   */
  const loadMySessions = async (userId: string, startDate: string, endDate: string) => {
    const { data: sessions, error } = await safeAsync(async () => {
      const result = await supabase
        .from("work_sessions")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });
      
      if (result.error) throw result.error;
      return result.data as WorkSession[];
    }, "Chargement sessions");

    if (error || !sessions) {
      console.error("Erreur chargement sessions:", error);
      return;
    }

    setMySessions(sessions);

    // Calculer le rapport mensuel
    const report = calculateMonthlyReportData(userId, profile?.full_name || "", sessions);
    setMyMonthlyReport(report);
  };

  /**
   * Charger les rapports de l'équipe (superviseurs)
   */
  const loadTeamReports = async (startDate: string, endDate: string) => {
    const { data: allSessions, error } = await safeAsync(async () => {
      const result = await supabase
        .from("work_sessions")
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("user_id", { ascending: true });
      
      if (result.error) throw result.error;
      return result.data;
    }, "Chargement rapports équipe");

    if (error || !allSessions) {
      console.error("Erreur chargement rapports équipe:", error);
      return;
    }

    // Grouper par utilisateur
    const userSessionsMap = new Map<string, { name: string; sessions: WorkSession[] }>();
    
    allSessions.forEach((session: any) => {
      const userId = session.user_id;
      const userName = session.profiles?.full_name || "Utilisateur inconnu";
      
      if (!userSessionsMap.has(userId)) {
        userSessionsMap.set(userId, { name: userName, sessions: [] });
      }
      
      userSessionsMap.get(userId)!.sessions.push(session);
    });

    // Calculer les rapports pour chaque utilisateur
    const reports: MonthlyReportData[] = [];
    userSessionsMap.forEach((data, userId) => {
      const report = calculateMonthlyReportData(userId, data.name, data.sessions);
      reports.push(report);
    });

    // Trier par total de travail (décroissant)
    reports.sort((a, b) => b.totalWorkMinutes - a.totalWorkMinutes);

    setTeamReports(reports);
  };

  /**
   * Calculer le rapport mensuel à partir des sessions
   */
  const calculateMonthlyReportData = (
    userId: string,
    userName: string,
    sessions: WorkSession[]
  ): MonthlyReportData => {
    const totalWorkMinutes = sessions.reduce((sum, s) => sum + (s.total_work_minutes || 0), 0);
    const totalOvertimeMinutes = sessions.reduce((sum, s) => sum + (s.overtime_minutes || 0), 0);
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const incompleteSessions = sessions.filter(s => s.status === 'incomplete').length;
    const averageDailyMinutes = sessions.length > 0 ? totalWorkMinutes / sessions.length : 0;

    return {
      userId,
      userName,
      totalWorkMinutes,
      totalOvertimeMinutes,
      completedSessions,
      incompleteSessions,
      averageDailyMinutes,
    };
  };

  /**
   * Export CSV - Mes sessions
   */
  const handleExportMySessionsCSV = () => {
    if (mySessions.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('fr-FR', { month: 'long' });
    
    // Créer le contenu CSV
    const headers = [
      "Date",
      "Arrivée",
      "Départ",
      "Temps de travail",
      "Pause",
      "Heures sup.",
      "Statut"
    ];

    const rows = mySessions.map(session => [
      formatDate(new Date(session.date)),
      session.clock_in_time ? new Date(session.clock_in_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
      session.clock_out_time ? new Date(session.clock_out_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
      formatDuration(session.total_work_minutes || 0),
      formatDuration(session.break_duration_minutes || 0),
      session.overtime_minutes ? formatDuration(session.overtime_minutes) : '-',
      session.status === 'completed' ? 'Complète' : session.status === 'in_progress' ? 'En cours' : 'Incomplète'
    ]);

    // Ajouter les totaux
    const totalWork = mySessions.reduce((sum, s) => sum + (s.total_work_minutes || 0), 0);
    const totalOvertime = mySessions.reduce((sum, s) => sum + (s.overtime_minutes || 0), 0);
    rows.push([]);
    rows.push(['TOTAUX', '', '', formatDuration(totalWork), '', formatDuration(totalOvertime), '']);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Télécharger le fichier
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `rapport_temps_${monthName}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Export CSV réussi!");
  };

  /**
   * Export CSV - Rapport équipe
   */
  const handleExportTeamReportCSV = () => {
    if (teamReports.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('fr-FR', { month: 'long' });
    
    // Créer le contenu CSV
    const headers = [
      "Employé",
      "Total travail",
      "Heures sup.",
      "Sessions complètes",
      "Sessions incomplètes",
      "Moyenne journalière"
    ];

    const rows = teamReports.map(report => [
      report.userName,
      formatDuration(report.totalWorkMinutes),
      formatDuration(report.totalOvertimeMinutes),
      report.completedSessions.toString(),
      report.incompleteSessions.toString(),
      formatDuration(report.averageDailyMinutes)
    ]);

    // Ajouter les totaux
    const totalWork = teamReports.reduce((sum, r) => sum + r.totalWorkMinutes, 0);
    const totalOvertime = teamReports.reduce((sum, r) => sum + r.totalOvertimeMinutes, 0);
    rows.push([]);
    rows.push(['TOTAUX', formatDuration(totalWork), formatDuration(totalOvertime), '', '', '']);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Télécharger le fichier
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `rapport_equipe_${monthName}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Export CSV réussi!");
  };

  /**
   * Export pour la paie
   */
  const handleExportPayrollCSV = () => {
    if (mySessions.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('fr-FR', { month: 'long' });
    
    // Format simplifié pour la paie
    const headers = [
      "Nom",
      "Mois",
      "Année",
      "Heures normales",
      "Heures supplémentaires",
      "Total heures"
    ];

    const totalWork = mySessions.reduce((sum, s) => sum + (s.total_work_minutes || 0), 0);
    const totalOvertime = mySessions.reduce((sum, s) => sum + (s.overtime_minutes || 0), 0);
    const normalHours = (totalWork - totalOvertime) / 60;
    const overtimeHours = totalOvertime / 60;
    const totalHours = totalWork / 60;

    const row = [
      profile?.full_name || '',
      monthName,
      selectedYear.toString(),
      normalHours.toFixed(2),
      overtimeHours.toFixed(2),
      totalHours.toFixed(2)
    ];

    const csvContent = [
      headers.join(','),
      row.join(',')
    ].join('\n');

    // Télécharger le fichier
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `paie_${monthName}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Export paie réussi!");
  };

  // Générer les options d'années (5 dernières années)
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  
  // Mois en français
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <FileText className="inline-block mr-2 h-8 w-8" />
            Rapports et Exports
          </h1>
          <p className="text-gray-600">
            Générez et exportez vos rapports de temps
          </p>
        </div>

        {/* Period Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sélection de la Période</CardTitle>
            <CardDescription>
              Choisissez le mois et l'année pour générer le rapport
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label>Mois</Label>
                <Select 
                  value={selectedMonth.toString()} 
                  onValueChange={(value) => setSelectedMonth(parseInt(value))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((name, index) => (
                      <SelectItem key={index + 1} value={(index + 1).toString()}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Année</Label>
                <Select 
                  value={selectedYear.toString()} 
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {generating && (
                <div className="flex items-end">
                  <div className="flex items-center text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Génération en cours...
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="my-report" className="space-y-6">
          <TabsList>
            <TabsTrigger value="my-report">
              <FileText className="h-4 w-4 mr-2" />
              Mon Rapport
            </TabsTrigger>
            {isSupervisor && (
              <TabsTrigger value="team-report">
                <Users className="h-4 w-4 mr-2" />
                Rapport Équipe
              </TabsTrigger>
            )}
            <TabsTrigger value="payroll">
              <Briefcase className="h-4 w-4 mr-2" />
              Export Paie
            </TabsTrigger>
          </TabsList>

          {/* My Report Tab */}
          <TabsContent value="my-report">
            {/* Summary Cards */}
            {myMonthlyReport && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Total Travaillé
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatDuration(myMonthlyReport.totalWorkMinutes)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Heures Sup.
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatDuration(myMonthlyReport.totalOvertimeMinutes)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Sessions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {myMonthlyReport.completedSessions}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {myMonthlyReport.incompleteSessions} incomplète(s)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Moyenne/Jour
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatDuration(myMonthlyReport.averageDailyMinutes)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Detailed Sessions Table */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Sessions Détaillées</CardTitle>
                    <CardDescription>
                      Toutes vos sessions pour {monthNames[selectedMonth - 1]} {selectedYear}
                    </CardDescription>
                  </div>
                  <Button onClick={handleExportMySessionsCSV} disabled={mySessions.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {mySessions.length > 0 ? (
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
                      {mySessions.map((session) => {
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
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune session pour cette période</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Report Tab (Supervisors only) */}
          {isSupervisor && (
            <TabsContent value="team-report">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Rapport d'Équipe</CardTitle>
                      <CardDescription>
                        Synthèse des temps par employé pour {monthNames[selectedMonth - 1]} {selectedYear}
                      </CardDescription>
                    </div>
                    <Button onClick={handleExportTeamReportCSV} disabled={teamReports.length === 0}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {teamReports.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employé</TableHead>
                          <TableHead>Total travail</TableHead>
                          <TableHead>Heures sup.</TableHead>
                          <TableHead>Sessions complètes</TableHead>
                          <TableHead>Sessions incomplètes</TableHead>
                          <TableHead>Moyenne/jour</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamReports.map((report) => (
                          <TableRow key={report.userId}>
                            <TableCell className="font-medium">
                              {escapeHtml(report.userName)}
                            </TableCell>
                            <TableCell className="font-semibold text-blue-600">
                              {formatDuration(report.totalWorkMinutes)}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {formatDuration(report.totalOvertimeMinutes)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                {report.completedSessions}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {report.incompleteSessions > 0 ? (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                  {report.incompleteSessions}
                                </Badge>
                              ) : (
                                <span className="text-gray-400">0</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {formatDuration(report.averageDailyMinutes)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Aucune donnée pour cette période</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Payroll Tab */}
          <TabsContent value="payroll">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Export pour Paie</CardTitle>
                    <CardDescription>
                      Données formatées pour le traitement de la paie
                    </CardDescription>
                  </div>
                  <Button onClick={handleExportPayrollCSV} disabled={!myMonthlyReport || mySessions.length === 0}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Télécharger CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {myMonthlyReport ? (
                  <div className="space-y-6">
                    {/* Summary for Payroll */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="font-semibold text-lg mb-4">
                        Récapitulatif - {monthNames[selectedMonth - 1]} {selectedYear}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                            <span className="font-medium text-gray-700">Employé:</span>
                            <span className="font-bold">{escapeHtml(profile?.full_name || "")}</span>
                          </div>
                          
                          <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                            <span className="font-medium text-gray-700">Période:</span>
                            <span className="font-bold">
                              {monthNames[selectedMonth - 1]} {selectedYear}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <span className="font-medium text-gray-700">Heures normales:</span>
                            <span className="font-bold text-blue-600">
                              {((myMonthlyReport.totalWorkMinutes - myMonthlyReport.totalOvertimeMinutes) / 60).toFixed(2)}h
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="font-medium text-gray-700">Heures supplémentaires:</span>
                            <span className="font-bold text-green-600">
                              {(myMonthlyReport.totalOvertimeMinutes / 60).toFixed(2)}h
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                            <span className="font-medium text-gray-700">Total heures:</span>
                            <span className="font-bold text-purple-600">
                              {(myMonthlyReport.totalWorkMinutes / 60).toFixed(2)}h
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Note:</strong> Ce rapport est formaté pour faciliter le traitement de la paie. 
                          Les heures sont converties en format décimal pour une intégration facile dans votre 
                          système de paie.
                        </p>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-700 mb-3">Informations Complémentaires</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Sessions complètes:</span>
                          <p className="font-semibold">{myMonthlyReport.completedSessions}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Sessions incomplètes:</span>
                          <p className="font-semibold">{myMonthlyReport.incompleteSessions}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Moyenne journalière:</span>
                          <p className="font-semibold">{formatDuration(myMonthlyReport.averageDailyMinutes)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total jours travaillés:</span>
                          <p className="font-semibold">{mySessions.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune donnée pour cette période</p>
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
