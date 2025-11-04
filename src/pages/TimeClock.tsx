/**
 * Page TimeClock - Pointage et gestion des présences
 * Module de gestion des temps avec sécurité complète intégrée
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Clock,
  LogIn,
  LogOut,
  Coffee,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Loader2,
  History,
  Timer,
} from "lucide-react";
import { toast } from "sonner";

// Import des fonctionnalités de sécurité
import { showError, safeAsync } from "@/utils/errorHandler";
import { escapeHtml, sanitizeString } from "@/utils/sanitizer";

// Import des types et fonctions time management
import type { TimeEntry, WorkSession, ClockEventType } from "@/types/time-management";
import {
  calculateDurationMinutes,
  calculateWorkSession,
  formatDuration,
  formatTime,
  formatDate,
} from "@/utils/time-calculator";

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
}

interface CurrentStatus {
  isClockedIn: boolean;
  isOnBreak: boolean;
  lastClockIn: TimeEntry | null;
  lastBreakStart: TimeEntry | null;
  todaySession: Partial<WorkSession> | null;
}

export default function TimeClock() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus>({
    isClockedIn: false,
    isOnBreak: false,
    lastClockIn: null,
    lastBreakStart: null,
    todaySession: null,
  });
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [geolocationEnabled, setGeolocationEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    checkAuthAndFetchData();
    
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /**
   * Vérifier l'authentification et charger les données
   */
  const checkAuthAndFetchData = async () => {
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

    // 3. Charger les données du jour
    await loadTodayData(user.id);

    // 4. Vérifier si la géolocalisation est disponible
    if ("geolocation" in navigator) {
      setGeolocationEnabled(true);
    }

    setLoading(false);
  };

  /**
   * Charger les données du jour
   */
  const loadTodayData = async (userId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    // Charger les entrées du jour
    const { data: entries, error: entriesError } = await safeAsync(async () => {
      const result = await supabase
        .from("time_entries")
        .select("*")
        .eq("user_id", userId)
        .gte("timestamp", todayIso)
        .order("timestamp", { ascending: false });
      
      if (result.error) throw result.error;
      return result.data as TimeEntry[];
    }, "Chargement entrées du jour");

    if (entriesError || !entries) {
      showError(entriesError || new Error("Impossible de charger les entrées"));
      return;
    }

    setTodayEntries(entries);

    // Déterminer le statut actuel
    const lastClockIn = entries.find(e => e.event_type === 'clock_in');
    const lastClockOut = entries.find(e => e.event_type === 'clock_out');
    const lastBreakStart = entries.find(e => e.event_type === 'break_start');
    const lastBreakEnd = entries.find(e => e.event_type === 'break_end');

    // Calcul du statut
    const isClockedIn = lastClockIn && (!lastClockOut || new Date(lastClockIn.timestamp) > new Date(lastClockOut.timestamp));
    const isOnBreak = lastBreakStart && (!lastBreakEnd || new Date(lastBreakStart.timestamp) > new Date(lastBreakEnd.timestamp));

    // Calculer la session du jour
    let todaySession: Partial<WorkSession> | null = null;
    if (isClockedIn && lastClockIn) {
      const breaks = entries.filter(e => e.event_type === 'break_start' || e.event_type === 'break_end');
      todaySession = calculateWorkSession(
        lastClockIn,
        lastClockOut || null,
        breaks,
        8 // Default 8h per day
      );
    }

    setCurrentStatus({
      isClockedIn: !!isClockedIn,
      isOnBreak: !!isOnBreak,
      lastClockIn: lastClockIn || null,
      lastBreakStart: lastBreakStart || null,
      todaySession,
    });
  };

  /**
   * Obtenir la géolocalisation
   */
  const getGeolocation = async (): Promise<{ latitude: number; longitude: number; address?: string } | null> => {
    if (!geolocationEnabled) return null;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Erreur géolocalisation:", error);
          resolve(null);
        }
      );
    });
  };

  /**
   * Créer une entrée de temps
   */
  const createTimeEntry = async (eventType: ClockEventType) => {
    if (!profile) return;

    setActionLoading(true);

    try {
      // Obtenir la géolocalisation
      const location = await getGeolocation();

      // Créer l'entrée
      const { data: entry, error: insertError } = await safeAsync(async () => {
        const result = await supabase
          .from("time_entries")
          .insert({
            user_id: profile.id,
            event_type: eventType,
            timestamp: new Date().toISOString(),
            latitude: location?.latitude,
            longitude: location?.longitude,
            device_info: { type: 'web' },
            validated: false,
          })
          .select()
          .single();
        
        if (result.error) throw result.error;
        return result.data;
      }, "Création entrée de temps");

      if (insertError || !entry) {
        showError(insertError || new Error("Impossible de créer l'entrée"));
        return;
      }

      // Messages de succès
      const messages: Record<ClockEventType, string> = {
        clock_in: "Pointage d'entrée enregistré ✅",
        clock_out: "Pointage de sortie enregistré ✅",
        break_start: "Pause commencée ☕",
        break_end: "Retour de pause enregistré ✅",
      };

      toast.success(messages[eventType]);

      // Recharger les données
      await loadTodayData(profile.id);
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Handlers pour les actions
   */
  const handleClockIn = () => createTimeEntry('clock_in');
  const handleClockOut = () => createTimeEntry('clock_out');
  const handleBreakStart = () => createTimeEntry('break_start');
  const handleBreakEnd = () => createTimeEntry('break_end');

  /**
   * Calculer le temps écoulé depuis la dernière action
   */
  const calculateElapsedTime = () => {
    if (currentStatus.isOnBreak && currentStatus.lastBreakStart) {
      return calculateDurationMinutes(currentStatus.lastBreakStart.timestamp, new Date().toISOString());
    } else if (currentStatus.isClockedIn && currentStatus.lastClockIn) {
      return calculateDurationMinutes(currentStatus.lastClockIn.timestamp, new Date().toISOString());
    }
    return 0;
  };

  const elapsedMinutes = calculateElapsedTime();

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
            <Clock className="inline-block mr-2 h-8 w-8" />
            Pointage
          </h1>
          <p className="text-gray-600">
            Bonjour <strong>{escapeHtml(profile?.full_name || "")}</strong>, gérez vos heures de présence
          </p>
          <div className="text-sm text-gray-500 mt-1">
            {formatDate(currentTime)} - {formatTime(currentTime)}
          </div>
        </div>

        {/* Status Alert */}
        {currentStatus.isClockedIn && (
          <Alert className="mb-6 border-green-500 bg-green-50">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-800">Vous êtes pointé(e)</AlertTitle>
            <AlertDescription className="text-green-700">
              {currentStatus.isOnBreak ? (
                <>En pause depuis {formatDuration(elapsedMinutes)}</>
              ) : (
                <>En service depuis {formatDuration(elapsedMinutes)}</>
              )}
            </AlertDescription>
          </Alert>
        )}

        {!currentStatus.isClockedIn && (
          <Alert className="mb-6 border-gray-400 bg-gray-50">
            <AlertCircle className="h-5 w-5 text-gray-600" />
            <AlertTitle className="text-gray-800">Vous n'êtes pas pointé(e)</AlertTitle>
            <AlertDescription className="text-gray-700">
              Cliquez sur "Arrivée" pour commencer votre journée
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Actions de pointage</CardTitle>
              <CardDescription>
                Gérez vos entrées et sorties
                {geolocationEnabled && (
                  <span className="flex items-center text-xs text-green-600 mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    Géolocalisation activée
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Clock In/Out Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  size="lg"
                  variant={currentStatus.isClockedIn ? "outline" : "default"}
                  onClick={handleClockIn}
                  disabled={currentStatus.isClockedIn || actionLoading}
                  className="h-20"
                >
                  {actionLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      Arrivée
                    </>
                  )}
                </Button>

                <Button
                  size="lg"
                  variant={currentStatus.isClockedIn ? "destructive" : "outline"}
                  onClick={handleClockOut}
                  disabled={!currentStatus.isClockedIn || currentStatus.isOnBreak || actionLoading}
                  className="h-20"
                >
                  {actionLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="h-5 w-5 mr-2" />
                      Départ
                    </>
                  )}
                </Button>
              </div>

              {/* Break Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  size="lg"
                  variant={currentStatus.isOnBreak ? "outline" : "secondary"}
                  onClick={handleBreakStart}
                  disabled={!currentStatus.isClockedIn || currentStatus.isOnBreak || actionLoading}
                  className="h-20"
                >
                  {actionLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Pause className="h-5 w-5 mr-2" />
                      Début pause
                    </>
                  )}
                </Button>

                <Button
                  size="lg"
                  variant={currentStatus.isOnBreak ? "secondary" : "outline"}
                  onClick={handleBreakEnd}
                  disabled={!currentStatus.isOnBreak || actionLoading}
                  className="h-20"
                >
                  {actionLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Fin pause
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Today's Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Résumé du jour</CardTitle>
              <CardDescription>
                Vue d'ensemble de votre journée
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentStatus.todaySession ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <Timer className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="font-medium text-gray-700">Temps de travail</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">
                      {formatDuration(currentStatus.todaySession.total_work_minutes || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center">
                      <Coffee className="h-5 w-5 text-purple-600 mr-2" />
                      <span className="font-medium text-gray-700">Temps de pause</span>
                    </div>
                    <span className="text-lg font-bold text-purple-600">
                      {formatDuration(currentStatus.todaySession.break_duration_minutes || 0)}
                    </span>
                  </div>

                  {currentStatus.todaySession.overtime_minutes && currentStatus.todaySession.overtime_minutes > 0 && (
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                        <span className="font-medium text-gray-700">Heures supplémentaires</span>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        +{formatDuration(currentStatus.todaySession.overtime_minutes)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Pointez pour commencer votre journée</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Today's History */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              <History className="inline-block mr-2 h-5 w-5" />
              Historique du jour
            </CardTitle>
            <CardDescription>
              Tous vos pointages d'aujourd'hui
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayEntries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Heure</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayEntries.map((entry) => {
                    const eventLabels: Record<ClockEventType, string> = {
                      clock_in: 'Arrivée',
                      clock_out: 'Départ',
                      break_start: 'Début pause',
                      break_end: 'Fin pause',
                    };

                    const eventColors: Record<ClockEventType, string> = {
                      clock_in: 'bg-green-100 text-green-800',
                      clock_out: 'bg-red-100 text-red-800',
                      break_start: 'bg-yellow-100 text-yellow-800',
                      break_end: 'bg-blue-100 text-blue-800',
                    };

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {formatTime(new Date(entry.timestamp))}
                        </TableCell>
                        <TableCell>
                          <Badge className={eventColors[entry.event_type]}>
                            {eventLabels[entry.event_type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.location ? (
                            <span className="flex items-center text-sm text-gray-600">
                              <MapPin className="h-3 w-3 mr-1" />
                              {entry.location.latitude.toFixed(4)}, {entry.location.longitude.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">Non disponible</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.validated ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Validé
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600">
                              En attente
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucun pointage aujourd'hui</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
