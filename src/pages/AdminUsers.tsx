import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Users, Loader2, Trash2, KeyRound, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type AppRole = 'agent' | 'supervisor' | 'admin';

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  is_active: boolean;
  roles: AppRole[];
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState<{ userId: string; currentEmail: string } | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState<{ userId: string; userEmail: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    setCurrentUserId(user.id);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      toast({
        title: "Accès refusé",
        description: "Seuls les administrateurs peuvent accéder à cette page",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchUsers();
  };

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, department, is_active")
        .order("full_name");

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const usersWithRoles = profilesData.map(profile => {
        const userRoles = rolesData
          .filter(r => r.user_id === profile.id)
          .map(r => r.role as AppRole);
        
        return {
          ...profile,
          roles: userRoles.length > 0 ? userRoles : ['agent' as AppRole],
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    try {
      // Remove all existing roles for this user
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Add the new role
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: newRole,
          assigned_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: "Rôle mis à jour",
        description: "Le rôle de l'utilisateur a été modifié avec succès",
      });

      fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le rôle",
        variant: "destructive",
      });
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !currentStatus })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Statut mis à jour",
        description: `Utilisateur ${!currentStatus ? 'activé' : 'désactivé'} avec succès`,
      });

      fetchUsers();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (userId === currentUserId) {
      toast({
        title: "Action impossible",
        description: "Vous ne pouvez pas supprimer votre propre compte",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      toast({
        title: "Utilisateur supprimé",
        description: "Le compte a été supprimé avec succès",
      });

      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer l'utilisateur",
        variant: "destructive",
      });
    }
  };

  const openPasswordDialog = (userId: string, userEmail: string) => {
    setEditingPassword({ userId, userEmail });
    setNewPassword("");
    setIsPasswordDialogOpen(true);
  };

  const updateUserPassword = async () => {
    if (!editingPassword) return;

    if (newPassword.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId: editingPassword.userId,
            newPassword: newPassword
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update password');
      }

      toast({
        title: "Mot de passe modifié",
        description: `Le mot de passe de ${editingPassword.userEmail} a été changé avec succès`,
      });

      setIsPasswordDialogOpen(false);
      setEditingPassword(null);
      setNewPassword("");
    } catch (error) {
      console.error("Error updating password:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de modifier le mot de passe",
        variant: "destructive",
      });
    }
  };

  const openEmailDialog = (userId: string, currentEmail: string) => {
    setEditingEmail({ userId, currentEmail });
    setNewEmail(currentEmail);
    setIsDialogOpen(true);
  };

  const updateUserEmail = async () => {
    if (!editingEmail) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId: editingEmail.userId, 
            newEmail: newEmail 
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update email');
      }

      toast({
        title: "Email mis à jour",
        description: "L'adresse email a été modifiée avec succès",
      });

      setIsDialogOpen(false);
      setEditingEmail(null);
      setNewEmail("");
      fetchUsers();
    } catch (error) {
      console.error("Error updating email:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de modifier l'email",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeColor = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'supervisor': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'supervisor': return 'Superviseur';
      default: return 'Agent';
    }
  };

  if (loading || !isAdmin) {
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
            <h1 className="text-3xl font-bold text-foreground">Gestion des Utilisateurs</h1>
            <p className="text-muted-foreground">Gérez les rôles et permissions des utilisateurs</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Utilisateurs ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Nom</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Département</th>
                    <th className="text-left py-3 px-4 font-semibold">Rôle</th>
                    <th className="text-left py-3 px-4 font-semibold">Statut</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{user.full_name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                      <td className="py-3 px-4">{user.department || '-'}</td>
                      <td className="py-3 px-4">
                        <Select
                          value={user.roles[0]}
                          onValueChange={(value) => updateUserRole(user.id, value as AppRole)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agent">Agent</SelectItem>
                            <SelectItem value="supervisor">Superviseur</SelectItem>
                            <SelectItem value="admin">Administrateur</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                          >
                            {user.is_active ? "Désactiver" : "Activer"}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEmailDialog(user.id, user.email)}
                            title="Modifier l'email"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPasswordDialog(user.id, user.email)}
                            title="Changer le mot de passe"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={user.id === currentUserId}
                                title="Supprimer l'utilisateur"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer le compte ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. Toutes les données de l'utilisateur 
                                  <strong> {user.full_name} ({user.email}) </strong> seront définitivement supprimées.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser(user.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'adresse email</DialogTitle>
            <DialogDescription>
              Entrez la nouvelle adresse email pour cet utilisateur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-email">Email actuel</Label>
              <Input
                id="current-email"
                value={editingEmail?.currentEmail || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Nouvel email</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nouvel.email@exemple.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={updateUserEmail}>
              Mettre à jour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le mot de passe</DialogTitle>
            <DialogDescription>
              Entrez le nouveau mot de passe pour {editingPassword?.userEmail}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={updateUserPassword}>
              Changer le mot de passe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
