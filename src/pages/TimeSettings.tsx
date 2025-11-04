/**
 * Page TimeSettings - Paramètres et configuration
 * Configuration des horaires, règles, et paramètres du module
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Settings,
  Clock,
  Save,
  Loader2,
  Shield,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

// Import des fonctionnalités de sécurité
import { showError, safeAsync } from "@/utils/errorHandler";
import { escapeHtml } from "@/utils/sanitizer";

// Import des types
import type { WorkSchedule, TimeRule, TimeBalance } from "@/types/time-management";

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
}

export default function TimeSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Schedule state
  const [schedule, setSchedule] = useState<Partial<WorkSchedule>>({
    monday_start: "09:00",
    monday_end: "17:00",
    tuesday_start: "09:00",
    tuesday_end: "17:00",
    wednesday_start: "09:00",
    wednesday_end: "17:00",
    thursday_start: "09:00",
    thursday_end: "17:00",
    friday_start: "09:00",
    friday_end: "17:00",
    saturday_start: null,
    saturday_end: null,
    sunday_start: null,
    sunday_end: null,
    expected_hours_per_week: 40,
  });
  
  // Rules state (admin only)
  const [rules, setRules] = useState<TimeRule[]>([]);
  const [activeRule, setActiveRule] = useState<TimeRule | null>(null);
  
  // Balance state
  const [balance, setBalance] = useState<TimeBalance | null>(null);

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

    // 3. Vérifier si admin
    const { data: roles } = await safeAsync(async () => {
      const result = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");
      
      if (result.error) throw result.error;
      return result.data;
    }, "Vérification rôle admin");

    setIsAdmin(!!roles && roles.length > 0);

    // 4. Charger les données
    await loadSchedule(user.id);
    await loadBalance(user.id);
    
    if (roles && roles.length > 0) {
      await loadRules();
    }

    setLoading(false);
  };

  /**
   * Charger mon horaire
   */
  const loadSchedule = async (userId: string) => {
    const { data: scheduleData, error } = await safeAsync(async () => {
      const result = await supabase
        .from("work_schedules")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (result.error) throw result.error;
      return result.data as WorkSchedule | null;
    }, "Chargement horaire");

    if (error) {
      console.error("Erreur chargement horaire:", error);
      return;
    }

    if (scheduleData) {
      setSchedule(scheduleData);
    }
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
      return;
    }

    setBalance(balanceData);
  };

  /**
   * Charger les règles (admin uniquement)
   */
  const loadRules = async () => {
    const { data: rulesData, error } = await safeAsync(async () => {
      const result = await supabase
        .from("time_rules")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (result.error) throw result.error;
      return result.data as TimeRule[];
    }, "Chargement règles");

    if (error || !rulesData) {
      console.error("Erreur chargement règles:", error);
      return;
    }

    setRules(rulesData);
    
    // Trouver la règle active
    const active = rulesData.find(r => r.is_active);
    if (active) {
      setActiveRule(active);
    }
  };

  /**
   * Sauvegarder l'horaire
   */
  const handleSaveSchedule = async () => {
    if (!profile) return;

    setSaving(true);

    try {
      // Vérifier si un horaire existe déjà
      const { data: existing } = await safeAsync(async () => {
        const result = await supabase
          .from("work_schedules")
          .select("id")
          .eq("user_id", profile.id)
          .maybeSingle();
        
        if (result.error) throw result.error;
        return result.data;
      }, "Vérification horaire existant");

      if (existing) {
        // Mettre à jour
        const { error } = await safeAsync(async () => {
          const result = await supabase
            .from("work_schedules")
            .update(schedule)
            .eq("user_id", profile.id);
          
          if (result.error) throw result.error;
          return result.data;
        }, "Mise à jour horaire");

        if (error) {
          showError(error);
          return;
        }
      } else {
        // Créer
        const { error } = await safeAsync(async () => {
          const result = await supabase
            .from("work_schedules")
            .insert({
              user_id: profile.id,
              ...schedule,
            });
          
          if (result.error) throw result.error;
          return result.data;
        }, "Création horaire");

        if (error) {
          showError(error);
          return;
        }
      }

      toast.success("Horaire sauvegardé avec succès!");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Initialiser les compteurs pour l'année en cours
   */
  const handleInitializeBalance = async () => {
    if (!profile) return;

    if (!window.confirm("Créer les compteurs pour l'année en cours ? Cela ne peut être fait qu'une fois par an.")) {
      return;
    }

    setSaving(true);

    try {
      const currentYear = new Date().getFullYear();

      const { error } = await safeAsync(async () => {
        const result = await supabase
          .from("time_balances")
          .insert({
            user_id: profile.id,
            year: currentYear,
            paid_leave_total: 25.0, // Standard France
            paid_leave_remaining: 25.0,
            rtt_total: 0,
            rtt_remaining: 0,
            overtime_accumulated_minutes: 0,
          });
        
        if (result.error) throw result.error;
        return result.data;
      }, "Initialisation compteurs");

      if (error) {
        showError(error);
        return;
      }

      toast.success(`Compteurs ${currentYear} créés avec succès!`);
      await loadBalance(profile.id);
    } finally {
      setSaving(false);
    }
  };

  const daysOfWeek = [
    { key: "monday", label: "Lundi" },
    { key: "tuesday", label: "Mardi" },
    { key: "wednesday", label: "Mercredi" },
    { key: "thursday", label: "Jeudi" },
    { key: "friday", label: "Vendredi" },
    { key: "saturday", label: "Samedi" },
    { key: "sunday", label: "Dimanche" },
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
            <Settings className="inline-block mr-2 h-8 w-8" />
            Paramètres
          </h1>
          <p className="text-gray-600">
            Configurez vos horaires et paramètres de temps
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList>
            <TabsTrigger value="schedule">
              <Clock className="h-4 w-4 mr-2" />
              Mon Horaire
            </TabsTrigger>
            <TabsTrigger value="balances">
              <Calendar className="h-4 w-4 mr-2" />
              Mes Compteurs
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="rules">
                <Shield className="h-4 w-4 mr-2" />
                Règles (Admin)
              </TabsTrigger>
            )}
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Configuration de mon Horaire</CardTitle>
                <CardDescription>
                  Définissez vos horaires de travail hebdomadaires
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Weekly Hours */}
                  <div className="space-y-2">
                    <Label htmlFor="weekly-hours">Heures hebdomadaires attendues</Label>
                    <Input
                      id="weekly-hours"
                      type="number"
                      step="0.5"
                      value={schedule.expected_hours_per_week || 40}
                      onChange={(e) => setSchedule({
                        ...schedule,
                        expected_hours_per_week: parseFloat(e.target.value)
                      })}
                      className="w-[200px]"
                    />
                    <p className="text-sm text-gray-500">
                      Nombre d'heures normales par semaine (ex: 35h, 40h)
                    </p>
                  </div>

                  {/* Days Schedule */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Horaires par jour</h3>
                    
                    {daysOfWeek.map((day) => (
                      <div key={day.key} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-4 border rounded-lg">
                        <div className="font-medium">{day.label}</div>
                        
                        <div className="space-y-1">
                          <Label htmlFor={`${day.key}-start`} className="text-xs">Début</Label>
                          <Input
                            id={`${day.key}-start`}
                            type="time"
                            value={schedule[`${day.key}_start` as keyof WorkSchedule] as string || ""}
                            onChange={(e) => setSchedule({
                              ...schedule,
                              [`${day.key}_start`]: e.target.value || null
                            })}
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor={`${day.key}-end`} className="text-xs">Fin</Label>
                          <Input
                            id={`${day.key}-end`}
                            type="time"
                            value={schedule[`${day.key}_end` as keyof WorkSchedule] as string || ""}
                            onChange={(e) => setSchedule({
                              ...schedule,
                              [`${day.key}_end`]: e.target.value || null
                            })}
                          />
                        </div>

                        <div className="text-sm text-gray-600">
                          {schedule[`${day.key}_start` as keyof WorkSchedule] && 
                           schedule[`${day.key}_end` as keyof WorkSchedule] ? (
                            <>
                              {(() => {
                                const start = schedule[`${day.key}_start` as keyof WorkSchedule] as string;
                                const end = schedule[`${day.key}_end` as keyof WorkSchedule] as string;
                                const [startH, startM] = start.split(':').map(Number);
                                const [endH, endM] = end.split(':').map(Number);
                                const minutes = (endH * 60 + endM) - (startH * 60 + startM);
                                const hours = Math.floor(minutes / 60);
                                const mins = minutes % 60;
                                return `${hours}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}`;
                              })()}
                            </>
                          ) : (
                            <span className="text-gray-400">Non travaillé</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button onClick={handleSaveSchedule} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Sauvegarder l'Horaire
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balances Tab */}
          <TabsContent value="balances">
            <Card>
              <CardHeader>
                <CardTitle>Mes Compteurs Annuels</CardTitle>
                <CardDescription>
                  Vue d'ensemble de vos compteurs pour {new Date().getFullYear()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {balance ? (
                  <div className="space-y-6">
                    {/* Paid Leave */}
                    <div className="p-6 bg-orange-50 border border-orange-200 rounded-lg">
                      <h3 className="font-semibold text-lg mb-4 text-orange-800">
                        Congés Payés
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total annuel</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {balance.paid_leave_total.toFixed(1)} jours
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Pris</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {(balance.paid_leave_total - balance.paid_leave_remaining).toFixed(1)} jours
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Restants</p>
                          <p className="text-2xl font-bold text-green-600">
                            {balance.paid_leave_remaining.toFixed(1)} jours
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* RTT */}
                    <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg">
                      <h3 className="font-semibold text-lg mb-4 text-purple-800">
                        RTT (Réduction du Temps de Travail)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total annuel</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {balance.rtt_total.toFixed(1)} jours
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Pris</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {(balance.rtt_total - balance.rtt_remaining).toFixed(1)} jours
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Restants</p>
                          <p className="text-2xl font-bold text-green-600">
                            {balance.rtt_remaining.toFixed(1)} jours
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Overtime */}
                    <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                      <h3 className="font-semibold text-lg mb-4 text-green-800">
                        Heures Supplémentaires
                      </h3>
                      <div>
                        <p className="text-sm text-gray-600">Accumulées</p>
                        <p className="text-2xl font-bold text-green-600">
                          {Math.floor(balance.overtime_accumulated_minutes / 60)}h 
                          {balance.overtime_accumulated_minutes % 60 > 0 && 
                            (balance.overtime_accumulated_minutes % 60).toString().padStart(2, '0')}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Total: {balance.overtime_accumulated_minutes} minutes
                        </p>
                      </div>
                    </div>

                    {/* Year Info */}
                    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div>
                        <p className="font-medium text-blue-800">
                          Année comptable: {balance.year}
                        </p>
                        <p className="text-sm text-blue-600">
                          Compteurs mis à jour automatiquement
                        </p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                    <h3 className="font-semibold text-lg mb-2">
                      Compteurs non initialisés
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Vos compteurs pour l'année {new Date().getFullYear()} n'ont pas encore été créés.
                    </p>
                    <Button onClick={handleInitializeBalance} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Création...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Initialiser les Compteurs
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rules Tab (Admin only) */}
          {isAdmin && (
            <TabsContent value="rules">
              <Card>
                <CardHeader>
                  <CardTitle>Règles de Temps (Administration)</CardTitle>
                  <CardDescription>
                    Configuration des règles métier appliquées à tous les employés
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeRule ? (
                    <div className="space-y-6">
                      {/* Active Rule Display */}
                      <div className="p-6 bg-green-50 border-2 border-green-500 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-lg text-green-800">
                            Règle Active: {escapeHtml(activeRule.name)}
                          </h3>
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Heures max par jour</p>
                            <p className="text-lg font-bold">{activeRule.max_daily_hours}h</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Heures max par semaine</p>
                            <p className="text-lg font-bold">{activeRule.max_weekly_hours}h</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Seuil heures sup (jour)</p>
                            <p className="text-lg font-bold">{activeRule.overtime_threshold_daily}h</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Heures standard (semaine)</p>
                            <p className="text-lg font-bold">{activeRule.standard_hours_per_week}h</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Pause min quotidienne</p>
                            <p className="text-lg font-bold">{activeRule.minimum_break_minutes} min</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Repos min entre jours</p>
                            <p className="text-lg font-bold">{activeRule.minimum_rest_hours}h</p>
                          </div>
                        </div>
                      </div>

                      {/* All Rules Table */}
                      {rules.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-lg mb-4">Toutes les Règles</h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Max jour</TableHead>
                                <TableHead>Max semaine</TableHead>
                                <TableHead>Heures standard</TableHead>
                                <TableHead>Statut</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rules.map((rule) => (
                                <TableRow key={rule.id}>
                                  <TableCell className="font-medium">
                                    {escapeHtml(rule.name)}
                                  </TableCell>
                                  <TableCell>{rule.max_daily_hours}h</TableCell>
                                  <TableCell>{rule.max_weekly_hours}h</TableCell>
                                  <TableCell>{rule.standard_hours_per_week}h</TableCell>
                                  <TableCell>
                                    {rule.is_active ? (
                                      <span className="text-green-600 font-medium">Active</span>
                                    ) : (
                                      <span className="text-gray-400">Inactive</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Note:</strong> Les règles sont définies au niveau système et s'appliquent 
                          à tous les employés. Seuls les administrateurs peuvent les modifier. Les modifications 
                          nécessitent un accès direct à la base de données.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Aucune règle active définie</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
