import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata_json: any;
  created_at: string;
  actor_email?: string;
  actor_name?: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if user is supervisor or admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["supervisor", "admin"]);

    if (!roles || roles.length === 0) {
      toast({
        title: "Accès refusé",
        description: "Seuls les superviseurs et administrateurs peuvent accéder aux logs",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setHasAccess(true);
    fetchLogs();
  };

  const fetchLogs = async () => {
    try {
      const { data: logsData, error: logsError } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // Get actor profiles for logs with actor_id
      const actorIds = [...new Set(logsData?.map(log => log.actor_id).filter(Boolean))];
      
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", actorIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const logsWithActors = logsData?.map(log => ({
          ...log,
          actor_name: log.actor_id ? profilesMap.get(log.actor_id)?.full_name : null,
          actor_email: log.actor_id ? profilesMap.get(log.actor_id)?.email : null,
        }));

        setLogs(logsWithActors || []);
      } else {
        setLogs(logsData || []);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("create") || action.includes("signup")) return "bg-success text-success-foreground";
    if (action.includes("update")) return "bg-warning text-warning-foreground";
    if (action.includes("delete")) return "bg-destructive text-destructive-foreground";
    if (action.includes("login")) return "bg-primary text-primary-foreground";
    return "bg-muted text-muted-foreground";
  };

  if (loading || !hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6 flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Logs d'Audit</h1>
            <p className="text-muted-foreground">Historique des actions et activités système</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Journal d'activité ({logs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun log enregistré</p>
              ) : (
                logs.map((log) => (
                  <div 
                    key={log.id} 
                    className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getActionBadgeColor(log.action)}>
                            {log.action}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            sur <strong>{log.entity_type}</strong>
                          </span>
                        </div>
                        
                        {log.actor_name && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Par:</span>{" "}
                            <strong>{log.actor_name}</strong> ({log.actor_email})
                          </p>
                        )}
                        
                        {log.metadata_json && Object.keys(log.metadata_json).length > 0 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Détails
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                              {JSON.stringify(log.metadata_json, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                      
                      <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd MMM yyyy", { locale: fr })}
                        <br />
                        {format(new Date(log.created_at), "HH:mm:ss")}
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
