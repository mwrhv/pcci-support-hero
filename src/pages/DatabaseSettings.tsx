import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Database, Download, Upload, Trash2, HardDrive } from "lucide-react";

export default function DatabaseSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      toast.error("Accès refusé", {
        description: "Vous devez être administrateur pour accéder à cette page.",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('database-export');

      if (error) throw error;

      // Create a blob and download it
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-export-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Export réussi", {
        description: "La base de données a été exportée avec succès.",
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Aucun fichier sélectionné");
      return;
    }

    setLoading(true);
    try {
      const fileContent = await importFile.text();
      const importData = JSON.parse(fileContent);

      const { data, error } = await supabase.functions.invoke('database-import', {
        body: { importData }
      });

      if (error) throw error;

      toast.success("Import réussi", {
        description: `Import terminé avec succès.`,
      });
      setImportFile(null);
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error("Erreur lors de l'import", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (confirmText !== "RESET DATABASE") {
      toast.error("Confirmation incorrecte");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('database-reset', {
        body: { confirmText }
      });

      if (error) throw error;

      toast.success("Réinitialisation réussie", {
        description: "La base de données a été réinitialisée (comptes utilisateurs préservés).",
      });
      setShowResetDialog(false);
      setConfirmText("");
    } catch (error: any) {
      console.error("Reset error:", error);
      toast.error("Erreur lors de la réinitialisation", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            Paramètres de la base de données
          </h1>
          <p className="text-muted-foreground mt-2">
            Gérez les opérations de sauvegarde et de restauration de la base de données
          </p>
        </div>

        <div className="space-y-6">
          {/* Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Exporter la base de données
              </CardTitle>
              <CardDescription>
                Téléchargez une copie complète de toutes les données de la base de données au format JSON.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExport} disabled={loading}>
                <Download className="h-4 w-4 mr-2" />
                Exporter maintenant
              </Button>
            </CardContent>
          </Card>

          {/* Backup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Backup de la base de données
              </CardTitle>
              <CardDescription>
                Créez une sauvegarde complète de la base de données (identique à l'export).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExport} disabled={loading} variant="secondary">
                <HardDrive className="h-4 w-4 mr-2" />
                Créer un backup
              </Button>
            </CardContent>
          </Card>

          {/* Import */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importer la base de données
              </CardTitle>
              <CardDescription>
                Restaurez les données à partir d'un fichier JSON exporté précédemment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="import-file">Fichier d'import (JSON)</Label>
                <Input
                  id="import-file"
                  type="file"
                  accept=".json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="mt-2"
                />
              </div>
              <Button onClick={handleImport} disabled={loading || !importFile}>
                <Upload className="h-4 w-4 mr-2" />
                Importer
              </Button>
            </CardContent>
          </Card>

          {/* Reset */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Réinitialiser la base de données
              </CardTitle>
              <CardDescription>
                ⚠️ DANGER : Cette action supprimera toutes les données (tickets, catégories, etc.) mais préservera les comptes utilisateurs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setShowResetDialog(true)} 
                disabled={loading}
                variant="destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Cette action supprimera définitivement toutes les données suivantes :
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Tous les tickets et leurs mises à jour</li>
                <li>Toutes les catégories</li>
                <li>Tous les actifs</li>
                <li>Tous les articles de la base de connaissances</li>
                <li>Toutes les notifications</li>
                <li>Tous les logs d'audit</li>
              </ul>
              <p className="font-semibold">
                Les comptes utilisateurs seront préservés.
              </p>
              <div className="space-y-2">
                <Label htmlFor="confirm-text">
                  Tapez "RESET DATABASE" pour confirmer :
                </Label>
                <Input
                  id="confirm-text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="RESET DATABASE"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText("")}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={confirmText !== "RESET DATABASE" || loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Réinitialiser définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
