/**
 * Page LeaveManagement - Gestion des demandes d'absence
 * Formulaire de demande, liste des demandes, workflow d'approbation
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import {
  Calendar,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  FileText,
  Users,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

// Import des fonctionnalités de sécurité
import { showError, safeAsync } from "@/utils/errorHandler";
import { escapeHtml, sanitizeString } from "@/utils/sanitizer";

// Import des types
import type { LeaveRequest, TimeBalance, LeaveType, LeaveStatus } from "@/types/time-management";
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from "@/types/time-management";
import { formatDate } from "@/utils/time-calculator";

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
}

interface LeaveRequestWithUser extends LeaveRequest {
  user_full_name?: string;
}

export default function LeaveManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [teamRequests, setTeamRequests] = useState<LeaveRequestWithUser[]>([]);
  const [balance, setBalance] = useState<TimeBalance | null>(null);
  
  // Form state
  const [leaveType, setLeaveType] = useState<LeaveType>("paid_leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<LeaveType | "all">("all");
  
  // Dialog state
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestWithUser | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState("");

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

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

    const isSupervisorUser = !!roles && roles.length > 0;
    setIsSupervisor(isSupervisorUser);

    // 4. Charger les données
    await loadMyRequests(user.id);
    await loadBalance(user.id);
    
    if (isSupervisorUser) {
      await loadTeamRequests();
    }

    setLoading(false);
  };

  /**
   * Charger mes demandes
   */
  const loadMyRequests = async (userId: string) => {
    const { data: requests, error } = await safeAsync(async () => {
      const result = await supabase
        .from("leave_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (result.error) throw result.error;
      return result.data as LeaveRequest[];
    }, "Chargement demandes");

    if (error || !requests) {
      showError(error || new Error("Impossible de charger les demandes"));
      return;
    }

    setMyRequests(requests);
  };

  /**
   * Charger les demandes de l'équipe (pour superviseurs)
   */
  const loadTeamRequests = async () => {
    const { data: requests, error } = await safeAsync(async () => {
      const result = await supabase
        .from("leave_requests")
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .order("created_at", { ascending: false });
      
      if (result.error) throw result.error;
      
      // Transform data to include user_full_name
      return (result.data || []).map((req: any) => ({
        ...req,
        user_full_name: req.profiles?.full_name || "Utilisateur inconnu"
      })) as LeaveRequestWithUser[];
    }, "Chargement demandes équipe");

    if (error || !requests) {
      console.error("Erreur chargement demandes équipe:", error);
      return;
    }

    setTeamRequests(requests);
  };

  /**
   * Charger les compteurs
   */
  const loadBalance = async (userId: string) => {
    const { data: balanceData, error } = await safeAsync(async () => {
      const result = await supabase
        .from("time_balances")
        .select("*")
        .eq("user_id", userId)
        .eq("year", new Date().getFullYear())
        .maybeSingle();
      
      if (result.error) throw result.error;
      return result.data as TimeBalance | null;
    }, "Chargement compteurs");

    if (error) {
      console.error("Erreur chargement compteurs:", error);
    }

    setBalance(balanceData);
  };

  /**
   * Calculer la durée en jours
   */
  const calculateDurationDays = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationMs = endDate.getTime() - startDate.getTime();
    return Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1;
  };

  /**
   * Soumettre une nouvelle demande
   */
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile || !startDate || !endDate) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    // Validation des dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      toast.error("La date de début ne peut pas être dans le passé");
      return;
    }

    if (end < start) {
      toast.error("La date de fin doit être après la date de début");
      return;
    }

    const durationDays = calculateDurationDays(startDate, endDate);

    // Vérification du solde pour congés payés et RTT
    if (leaveType === "paid_leave" && balance) {
      if (durationDays > balance.paid_leave_remaining) {
        toast.error(`Solde insuffisant. Vous avez ${balance.paid_leave_remaining.toFixed(1)} jours disponibles`);
        return;
      }
    } else if (leaveType === "rtt" && balance) {
      if (durationDays > balance.rtt_remaining) {
        toast.error(`Solde RTT insuffisant. Vous avez ${balance.rtt_remaining.toFixed(1)} jours disponibles`);
        return;
      }
    }

    setSubmitting(true);

    try {
      // Créer la demande
      const { data: newRequest, error } = await safeAsync(async () => {
        const result = await supabase
          .from("leave_requests")
          .insert({
            user_id: profile.id,
            leave_type: leaveType,
            start_date: startDate,
            end_date: endDate,
            reason: sanitizeString(reason),
            status: "pending",
          })
          .select()
          .single();
        
        if (result.error) throw result.error;
        return result.data;
      }, "Création demande");

      if (error || !newRequest) {
        showError(error || new Error("Impossible de créer la demande"));
        return;
      }

      toast.success("Demande créée avec succès! En attente d'approbation.");

      // Réinitialiser le formulaire
      setLeaveType("paid_leave");
      setStartDate("");
      setEndDate("");
      setReason("");

      // Recharger les demandes
      await loadMyRequests(profile.id);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Annuler une demande
   */
  const handleCancelRequest = async (requestId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette demande ?")) {
      return;
    }

    const { error } = await safeAsync(async () => {
      const result = await supabase
        .from("leave_requests")
        .update({ status: "cancelled" })
        .eq("id", requestId);
      
      if (result.error) throw result.error;
      return result.data;
    }, "Annulation demande");

    if (error) {
      showError(error);
      return;
    }

    toast.success("Demande annulée");
    
    if (profile) {
      await loadMyRequests(profile.id);
    }
  };

  /**
   * Ouvrir le dialog de révision
   */
  const handleOpenReview = (request: LeaveRequestWithUser) => {
    setSelectedRequest(request);
    setReviewComment("");
    setReviewDialogOpen(true);
  };

  /**
   * Approuver une demande
   */
  const handleApprove = async () => {
    if (!selectedRequest) return;

    const { error } = await safeAsync(async () => {
      const result = await supabase
        .from("leave_requests")
        .update({
          status: "approved",
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
          review_comment: sanitizeString(reviewComment),
        })
        .eq("id", selectedRequest.id);
      
      if (result.error) throw result.error;
      return result.data;
    }, "Approbation demande");

    if (error) {
      showError(error);
      return;
    }

    toast.success("Demande approuvée");
    setReviewDialogOpen(false);
    
    await loadTeamRequests();
    if (profile) {
      await loadMyRequests(profile.id);
    }
  };

  /**
   * Rejeter une demande
   */
  const handleReject = async () => {
    if (!selectedRequest) return;

    if (!reviewComment.trim()) {
      toast.error("Veuillez fournir une raison pour le rejet");
      return;
    }

    const { error } = await safeAsync(async () => {
      const result = await supabase
        .from("leave_requests")
        .update({
          status: "rejected",
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
          review_comment: sanitizeString(reviewComment),
        })
        .eq("id", selectedRequest.id);
      
      if (result.error) throw result.error;
      return result.data;
    }, "Rejet demande");

    if (error) {
      showError(error);
      return;
    }

    toast.success("Demande rejetée");
    setReviewDialogOpen(false);
    
    await loadTeamRequests();
    if (profile) {
      await loadMyRequests(profile.id);
    }
  };

  /**
   * Filtrer les demandes
   */
  const filterRequests = (requests: LeaveRequest[] | LeaveRequestWithUser[]) => {
    return requests.filter((req) => {
      if (statusFilter !== "all" && req.status !== statusFilter) return false;
      if (typeFilter !== "all" && req.leave_type !== typeFilter) return false;
      return true;
    });
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

  const statusColors: Record<LeaveStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  const filteredMyRequests = filterRequests(myRequests);
  const filteredTeamRequests = isSupervisor ? filterRequests(teamRequests) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <Calendar className="inline-block mr-2 h-8 w-8" />
            Gestion des Absences
          </h1>
          <p className="text-gray-600">
            Demandez et gérez vos congés et absences
          </p>
        </div>

        {/* Balance Cards */}
        {balance && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Congés Payés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {balance.paid_leave_remaining.toFixed(1)} jours
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  sur {balance.paid_leave_total.toFixed(1)} disponibles
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">RTT</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {balance.rtt_remaining.toFixed(1)} jours
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  sur {balance.rtt_total.toFixed(1)} disponibles
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Année</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {balance.year}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Compteurs annuels
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="new" className="space-y-6">
          <TabsList>
            <TabsTrigger value="new">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Demande
            </TabsTrigger>
            <TabsTrigger value="my-requests">
              <FileText className="h-4 w-4 mr-2" />
              Mes Demandes ({myRequests.length})
            </TabsTrigger>
            {isSupervisor && (
              <TabsTrigger value="team-requests">
                <Users className="h-4 w-4 mr-2" />
                Équipe ({teamRequests.filter(r => r.status === 'pending').length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* New Request Tab */}
          <TabsContent value="new">
            <Card>
              <CardHeader>
                <CardTitle>Nouvelle Demande d'Absence</CardTitle>
                <CardDescription>
                  Remplissez le formulaire pour soumettre une demande
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitRequest} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Type */}
                    <div className="space-y-2">
                      <Label htmlFor="leave-type">Type d'absence *</Label>
                      <Select value={leaveType} onValueChange={(value) => setLeaveType(value as LeaveType)}>
                        <SelectTrigger id="leave-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Duration Display */}
                    <div className="space-y-2">
                      <Label>Durée</Label>
                      <div className="h-10 flex items-center px-3 border rounded-md bg-gray-50">
                        {startDate && endDate ? (
                          <span className="font-medium text-blue-600">
                            {calculateDurationDays(startDate, endDate)} jour(s)
                          </span>
                        ) : (
                          <span className="text-gray-400">Sélectionnez les dates</span>
                        )}
                      </div>
                    </div>

                    {/* Start Date */}
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Date de début *</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    {/* End Date */}
                    <div className="space-y-2">
                      <Label htmlFor="end-date">Date de fin *</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                        min={startDate || new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="space-y-2">
                    <Label htmlFor="reason">Motif (optionnel)</Label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Précisez le motif de votre demande..."
                      rows={3}
                    />
                  </div>

                  {/* Submit Button */}
                  <Button type="submit" disabled={submitting} className="w-full md:w-auto">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Soumettre la Demande
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Requests Tab */}
          <TabsContent value="my-requests">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Mes Demandes</CardTitle>
                    <CardDescription>
                      Historique de toutes vos demandes d'absence
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as LeaveStatus | "all")}>
                      <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        {Object.entries(LEAVE_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as LeaveType | "all")}>
                      <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredMyRequests.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead>Durée</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Créée le</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMyRequests.map((request) => {
                        const durationDays = calculateDurationDays(request.start_date, request.end_date);
                        
                        return (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">
                              {LEAVE_TYPE_LABELS[request.leave_type]}
                            </TableCell>
                            <TableCell>
                              {formatDate(new Date(request.start_date))} - {formatDate(new Date(request.end_date))}
                            </TableCell>
                            <TableCell>
                              {durationDays} jour{durationDays > 1 ? 's' : ''}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[request.status]}>
                                {LEAVE_STATUS_LABELS[request.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDate(new Date(request.created_at))}
                            </TableCell>
                            <TableCell>
                              {request.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleCancelRequest(request.id)}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Annuler
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune demande trouvée</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Requests Tab (Supervisors only) */}
          {isSupervisor && (
            <TabsContent value="team-requests">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Demandes de l'Équipe</CardTitle>
                      <CardDescription>
                        Approuvez ou rejetez les demandes d'absence
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as LeaveStatus | "all")}>
                        <SelectTrigger className="w-[150px]">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          {Object.entries(LEAVE_STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredTeamRequests.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employé</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Période</TableHead>
                          <TableHead>Durée</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTeamRequests.map((request) => {
                          const durationDays = calculateDurationDays(request.start_date, request.end_date);
                          
                          return (
                            <TableRow key={request.id}>
                              <TableCell className="font-medium">
                                {escapeHtml(request.user_full_name || "Utilisateur inconnu")}
                              </TableCell>
                              <TableCell>
                                {LEAVE_TYPE_LABELS[request.leave_type]}
                              </TableCell>
                              <TableCell>
                                {formatDate(new Date(request.start_date))} - {formatDate(new Date(request.end_date))}
                              </TableCell>
                              <TableCell>
                                {durationDays} jour{durationDays > 1 ? 's' : ''}
                              </TableCell>
                              <TableCell>
                                <Badge className={statusColors[request.status]}>
                                  {LEAVE_STATUS_LABELS[request.status]}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {request.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenReview(request)}
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    Réviser
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Aucune demande à réviser</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réviser la Demande</DialogTitle>
            <DialogDescription>
              Approuvez ou rejetez cette demande d'absence
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Employé:</span>
                  <p className="mt-1">{escapeHtml(selectedRequest.user_full_name || "")}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Type:</span>
                  <p className="mt-1">{LEAVE_TYPE_LABELS[selectedRequest.leave_type]}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Début:</span>
                  <p className="mt-1">{formatDate(new Date(selectedRequest.start_date))}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Fin:</span>
                  <p className="mt-1">{formatDate(new Date(selectedRequest.end_date))}</p>
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-gray-600">Durée:</span>
                  <p className="mt-1">
                    {calculateDurationDays(selectedRequest.start_date, selectedRequest.end_date)} jour(s)
                  </p>
                </div>
                {selectedRequest.reason && (
                  <div className="col-span-2">
                    <span className="font-medium text-gray-600">Motif:</span>
                    <p className="mt-1 text-gray-700">{escapeHtml(selectedRequest.reason)}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-comment">Commentaire</Label>
                <Textarea
                  id="review-comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Ajoutez un commentaire (obligatoire pour le rejet)..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              <XCircle className="h-4 w-4 mr-2" />
              Rejeter
            </Button>
            <Button onClick={handleApprove}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approuver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
