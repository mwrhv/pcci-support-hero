/**
 * Page Genspark Analysis
 * Système d'analyse intelligente des incidents IT
 * Avec sécurité complète intégrée
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
  Brain,
  Download,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  FileText,
  BarChart3,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

// Import des fonctionnalités de sécurité
import { showError, safeAsync } from "@/utils/errorHandler";
import { escapeHtml, sanitizeString } from "@/utils/sanitizer";

// Import des types et fonctions Genspark
import type { TicketData, GensarkAnalysis, DailySummary } from "@/types/genspark";
import {
  analyzeTicket,
  generateDailySummary,
  exportToCSV,
} from "@/utils/genspark-analyzer";

export default function GensarkAnalysis() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [analyses, setAnalyses] = useState<GensarkAnalysis[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<GensarkAnalysis | null>(null);

  useEffect(() => {
    checkAccessAndFetchData();
  }, []);

  /**
   * Vérifier l'accès et charger les données
   */
  const checkAccessAndFetchData = async () => {
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

    // 2. Vérifier le profil et les droits
    const { data: profile, error: profileError } = await safeAsync(async () => {
      const result = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (result.error) throw result.error;
      return result.data;
    }, "Vérification profil");

    if (profileError || !profile) {
      showError(profileError || new Error("Profil introuvable"));
      navigate("/dashboard");
      return;
    }

    // 3. Vérifier les droits d'accès (superviseur ou admin)
    if (profile.role !== "supervisor" && profile.role !== "admin") {
      showError(new Error("Accès refusé - Droits superviseur ou admin requis"));
      toast.error("Vous n'avez pas les droits pour accéder à cette page");
      navigate("/dashboard");
      return;
    }

    // 4. Charger les tickets
    await fetchTickets();
  };

  /**
   * Récupérer les tickets avec gestion d'erreurs
   */
  const fetchTickets = async () => {
    setLoading(true);

    const { data: ticketsData, error: ticketsError } = await safeAsync(async () => {
      const result = await supabase
        .from("tickets")
        .select(`
          *,
          profiles:user_id(full_name, email, department, pcci_id)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (result.error) throw result.error;
      return result.data;
    }, "Chargement tickets");

    if (ticketsError) {
      showError(ticketsError);
      setLoading(false);
      return;
    }

    // Mapper et sanitiser les données
    const mappedTickets: TicketData[] = (ticketsData || []).map((ticket) => ({
      id: sanitizeString(ticket.id),
      code: sanitizeString(ticket.code || ""),
      firstName: sanitizeString(ticket.profiles?.full_name?.split(" ")[0] || ""),
      lastName: sanitizeString(ticket.profiles?.full_name?.split(" ").slice(1).join(" ") || ""),
      userId: sanitizeString(ticket.user_id || ""),
      department: sanitizeString(ticket.profiles?.department || "Non spécifié"),
      location: sanitizeString(ticket.place || ""),
      phone: sanitizeString(ticket.phone || ""),
      email: sanitizeString(ticket.profiles?.email || ""),
      motif: sanitizeString(ticket.title || ""),
      description: sanitizeString(ticket.description || ""),
      interventionDate: ticket.intervention_date || "",
      status: ticket.status || "open",
      createdAt: ticket.created_at || "",
      updatedAt: ticket.updated_at || "",
    }));

    setTickets(mappedTickets);
    setLoading(false);
  };

  /**
   * Lancer l'analyse Genspark
   */
  const runAnalysis = async () => {
    if (tickets.length === 0) {
      toast.error("Aucun ticket à analyser");
      return;
    }

    setAnalyzing(true);
    toast.info("Analyse en cours...");

    try {
      // Analyser chaque ticket
      const ticketAnalyses = tickets.map((ticket) => analyzeTicket(ticket));
      setAnalyses(ticketAnalyses);

      // Générer le résumé quotidien
      const dailySummary = generateDailySummary(tickets, ticketAnalyses);
      setSummary(dailySummary);

      toast.success(`✅ Analyse terminée: ${ticketAnalyses.length} tickets analysés`);
    } catch (error) {
      showError(error instanceof Error ? error : new Error("Erreur d'analyse"));
    } finally {
      setAnalyzing(false);
    }
  };

  /**
   * Exporter les résultats en CSV
   */
  const handleExport = () => {
    if (analyses.length === 0) {
      toast.error("Aucune analyse à exporter");
      return;
    }

    try {
      const csv = exportToCSV(analyses);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", `genspark-analysis-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Export CSV réussi");
    } catch (error) {
      showError(error instanceof Error ? error : new Error("Erreur d'export"));
    }
  };

  /**
   * Obtenir la couleur du badge selon la priorité
   */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Brain className="h-8 w-8 text-primary" />
                Genspark AI Analysis
              </h1>
              <p className="mt-2 text-gray-600">
                Système d'analyse intelligente des incidents IT
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={fetchTickets}
                variant="outline"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Actualiser
              </Button>
              <Button
                onClick={runAnalysis}
                disabled={analyzing || tickets.length === 0}
              >
                <Brain className={`h-4 w-4 mr-2 ${analyzing ? "animate-pulse" : ""}`} />
                {analyzing ? "Analyse en cours..." : "Lancer l'analyse"}
              </Button>
              {analyses.length > 0 && (
                <Button onClick={handleExport} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter CSV
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Statistiques rapides */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.totalTickets}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Incidents Critiques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {summary.criticalIssues.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Incidents Récurrents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {summary.overallRecurrentIncidents}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Départements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {summary.byDepartment.length}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs principales */}
        <Tabs defaultValue="analyses" className="space-y-6">
          <TabsList>
            <TabsTrigger value="analyses">
              <FileText className="h-4 w-4 mr-2" />
              Analyses Détaillées
            </TabsTrigger>
            <TabsTrigger value="summary">
              <BarChart3 className="h-4 w-4 mr-2" />
              Résumé par Département
            </TabsTrigger>
            <TabsTrigger value="recommendations">
              <TrendingUp className="h-4 w-4 mr-2" />
              Recommandations
            </TabsTrigger>
          </TabsList>

          {/* Tab: Analyses détaillées */}
          <TabsContent value="analyses">
            <Card>
              <CardHeader>
                <CardTitle>Analyses Détaillées des Tickets</CardTitle>
                <CardDescription>
                  Vue détaillée de l'analyse IA pour chaque ticket
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyses.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Brain className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Aucune analyse disponible</p>
                    <p className="mt-2">
                      Cliquez sur "Lancer l'analyse" pour analyser les tickets
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analyses.map((analysis) => (
                      <Card
                        key={analysis.ticketId}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedAnalysis(analysis)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CardTitle className="text-lg">
                                Ticket #{escapeHtml(analysis.ticketCode)}
                              </CardTitle>
                              <Badge className={getPriorityColor(analysis.priority)}>
                                {analysis.priority.toUpperCase()}
                              </Badge>
                              {analysis.isRecurrent && (
                                <Badge variant="outline" className="border-orange-500 text-orange-600">
                                  Récurrent
                                </Badge>
                              )}
                              {analysis.escalationNeeded && (
                                <Badge variant="outline" className="border-red-500 text-red-600">
                                  Escalade requise
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline">
                              {escapeHtml(analysis.department)}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <span className="font-semibold">Type: </span>
                              <span dangerouslySetInnerHTML={{ __html: escapeHtml(analysis.incidentType) }} />
                            </div>
                            <div>
                              <span className="font-semibold">Résumé: </span>
                              <span dangerouslySetInnerHTML={{ __html: escapeHtml(analysis.summary) }} />
                            </div>
                            <div className="flex gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span dangerouslySetInnerHTML={{ __html: escapeHtml(analysis.estimatedResolutionTime) }} />
                              </div>
                              <div className="flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" />
                                Urgence: <span dangerouslySetInnerHTML={{ __html: escapeHtml(analysis.urgency) }} />
                              </div>
                            </div>
                            <div>
                              <span className="font-semibold">Solutions proposées:</span>
                              <ul className="mt-2 space-y-1 text-sm">
                                {analysis.proposedSolutions.slice(0, 3).map((solution, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span dangerouslySetInnerHTML={{ __html: escapeHtml(solution) }} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Résumé par département */}
          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle>Résumé par Département</CardTitle>
                <CardDescription>
                  Statistiques et répartition des incidents par département
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!summary ? (
                  <div className="text-center py-12 text-gray-500">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Lancez une analyse pour voir le résumé</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Département</TableHead>
                        <TableHead className="text-center">Critique</TableHead>
                        <TableHead className="text-center">Haute</TableHead>
                        <TableHead className="text-center">Moyenne</TableHead>
                        <TableHead className="text-center">Basse</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Récurrents</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.byDepartment.map((dept) => (
                        <TableRow key={dept.department}>
                          <TableCell className="font-medium">
                            <span dangerouslySetInnerHTML={{ __html: escapeHtml(dept.department) }} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-red-500">{dept.critical}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-orange-500">{dept.high}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-yellow-500">{dept.medium}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-green-500">{dept.low}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {dept.total}
                          </TableCell>
                          <TableCell className="text-center">
                            {dept.recurrentIncidents > 0 ? (
                              <Badge variant="outline" className="border-orange-500 text-orange-600">
                                {dept.recurrentIncidents}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Recommandations */}
          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle>Recommandations</CardTitle>
                <CardDescription>
                  Suggestions pour améliorer la gestion des incidents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!summary || summary.recommendations.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Aucune recommandation disponible</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {summary.recommendations.map((recommendation, idx) => (
                      <Card key={idx} className="border-l-4 border-l-primary">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                            <p
                              className="text-gray-700"
                              dangerouslySetInnerHTML={{ __html: escapeHtml(recommendation) }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {summary.criticalIssues.length > 0 && (
                      <Card className="border-l-4 border-l-red-500 mt-6">
                        <CardHeader>
                          <CardTitle className="text-red-600">
                            ⚠️ Incidents Critiques Nécessitant Attention Immédiate
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {summary.criticalIssues.map((issue, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                                <div>
                                  <span className="font-semibold">
                                    <span dangerouslySetInnerHTML={{ __html: escapeHtml(issue.ticketCode) }} />
                                  </span>
                                  {" - "}
                                  <span dangerouslySetInnerHTML={{ __html: escapeHtml(issue.department) }} />
                                  {": "}
                                  <span dangerouslySetInnerHTML={{ __html: escapeHtml(issue.issue) }} />
                                </div>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
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
