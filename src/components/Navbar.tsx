import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, User, Settings, FileText, Brain, Clock, BarChart3, Calendar } from "lucide-react";
import { toast } from "sonner";
import pcciLogo from "@/assets/pcci-logo.png";
import { NativeStatusBadge } from "@/components/NativeStatusBadge";

export const Navbar = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSupervisorOrAdmin, setIsSupervisorOrAdmin] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(data);

        // Check if user is admin from user_roles table
        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .single();
        
        setIsAdmin(!!adminRole);

        // Check if user is supervisor or admin
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["supervisor", "admin"]);
        
        setIsSupervisorOrAdmin(!!roles && roles.length > 0);
      }
    };
    
    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erreur lors de la déconnexion");
    } else {
      toast.success("Déconnexion réussie");
      navigate("/auth");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <img src={pcciLogo} alt="PCCI Logo" className="h-8 w-8" />
            <span className="text-xl font-bold">PCCI Help Desk</span>
          </Link>

          <div className="flex items-center space-x-4">
            <NativeStatusBadge />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {profile?.full_name ? getInitials(profile.full_name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{profile?.email}</p>
                    <p className="text-xs text-primary capitalize">{profile?.role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/time/clock")}>
                  <Clock className="mr-2 h-4 w-4" />
                  Pointage
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/time/dashboard")}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Tableau de Bord Temps
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/time/leaves")}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Gestion des Absences
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/admin/users")}>
                      <Settings className="mr-2 h-4 w-4" />
                      Gestion des Utilisateurs
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/statistics")}>
                      <Settings className="mr-2 h-4 w-4" />
                      Analyse statistique
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/admin/database")}>
                      <Settings className="mr-2 h-4 w-4" />
                      Paramètres Base de Données
                    </DropdownMenuItem>
                  </>
                )}
                {isSupervisorOrAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin/genspark")}>
                    <Brain className="mr-2 h-4 w-4" />
                    Genspark AI Analysis
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin/logs")}>
                    <FileText className="mr-2 h-4 w-4" />
                    Logs d'Audit
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};
