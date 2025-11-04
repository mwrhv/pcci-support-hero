import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldCheck, ShieldAlert, AlertCircle } from "lucide-react";
import pcciLogo from "@/assets/pcci-logo.png";

// Import des nouvelles fonctionnalités de sécurité
import { signUpSchema, signInSchema } from "@/schemas/authSchemas";
import { showError, safeAsync } from "@/utils/errorHandler";
import { 
  authRateLimiter, 
  checkRateLimit,
  checkPasswordStrength 
} from "@/utils/security";
import { sanitizeEmail } from "@/utils/sanitizer";

// Schéma spécifique PCCI avec validation email - nous devons importer z depuis zod
import { z } from "zod";

const pcciSignUpSchema = z.object({
  email: z.string().email().refine(
    (email) => email.endsWith("@pcci.sn"),
    { message: "Seuls les emails @pcci.sn sont autorisés" }
  ),
  password: z.string().min(8),
  confirmPassword: z.string(),
  fullName: z.string().min(2),
  userId: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

const pcciSignInSchema = z.object({
  email: z.string().email().refine(
    (email) => email.endsWith("@pcci.sn"),
    { message: "Seuls les emails @pcci.sn sont autorisés" }
  ),
  password: z.string().min(1),
});

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [], isStrong: false });
  const [signUpPassword, setSignUpPassword] = useState("");

  const handlePasswordChange = (password: string) => {
    setSignUpPassword(password);
    const strength = checkPasswordStrength(password);
    setPasswordStrength(strength);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Extraction des données
      const formData = new FormData(e.currentTarget);
      const userId = formData.get("userId") as string;
      let email = formData.get("email") as string;
      const password = formData.get("password") as string;
      const fullName = formData.get("fullName") as string;
      const confirmPassword = formData.get("confirmPassword") as string;

      // 2. Sanitisation de l'email
      const cleanEmail = sanitizeEmail(email);
      if (!cleanEmail) {
        toast.error("Email invalide");
        return;
      }
      email = cleanEmail;

      // 3. Validation Zod avec schéma PCCI
      const validated = pcciSignUpSchema.parse({ 
        userId, 
        email, 
        password, 
        fullName,
        confirmPassword 
      });

      // 4. Vérification force du mot de passe
      const strength = checkPasswordStrength(password);
      if (!strength.isStrong) {
        toast.error("Mot de passe trop faible", {
          description: strength.feedback.join(", ")
        });
        return;
      }

      // 5. Inscription avec gestion d'erreurs sécurisée
      const { data, error } = await safeAsync(async () => {
        const result = await supabase.auth.signUp({
          email: validated.email,
          password: validated.password,
          options: {
            data: {
              user_id: validated.email.split('@')[0],
              full_name: validated.fullName,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (result.error) throw result.error;
        return result.data;
      }, "Inscription");

      if (error) {
        // Gestion spécifique des erreurs d'inscription
        if (error.message?.toLowerCase().includes("already registered")) {
          toast.error("Cette adresse email est déjà utilisée");
        } else {
          showError(error);
        }
        return;
      }

      if (data?.user) {
        toast.success("Inscription réussie !", {
          description: "Veuillez vérifier votre email pour confirmer votre compte.",
          duration: 6000
        });
      }
    } catch (error) {
      showError(error, "Inscription");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Extraction des données
      const formData = new FormData(e.currentTarget);
      let email = formData.get("email") as string;
      const password = formData.get("password") as string;

      // 2. Sanitisation de l'email
      const cleanEmail = sanitizeEmail(email);
      if (!cleanEmail) {
        toast.error("Email invalide");
        return;
      }
      email = cleanEmail;

      // 3. Rate Limiting - Protection contre le brute force
      try {
        checkRateLimit(
          authRateLimiter,
          email,
          "Trop de tentatives de connexion. Réessayez dans quelques minutes."
        );
      } catch (rateLimitError: any) {
        toast.error(rateLimitError.message, {
          duration: 10000,
          icon: <ShieldAlert className="h-5 w-5 text-destructive" />
        });
        return;
      }

      // 4. Validation Zod avec schéma PCCI
      const validated = pcciSignInSchema.parse({ email, password });

      // 5. Connexion avec gestion d'erreurs sécurisée
      const { data, error } = await safeAsync(async () => {
        const result = await supabase.auth.signInWithPassword({
          email: validated.email,
          password: validated.password,
        });

        if (result.error) throw result.error;
        return result.data;
      }, "Connexion");

      if (error) {
        // Gestion spécifique des erreurs de connexion
        if (error.message?.toLowerCase().includes("invalid") || 
            error.message?.toLowerCase().includes("credentials")) {
          toast.error("Email ou mot de passe incorrect", {
            icon: <AlertCircle className="h-5 w-5" />
          });
        } else {
          showError(error);
        }
        return;
      }

      // 6. Vérification email confirmé
      if (data?.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        toast.error("Email non confirmé", {
          description: "Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte mail.",
          duration: 8000
        });
        return;
      }

      // 7. Reset du rate limiter en cas de succès
      authRateLimiter.reset(email);

      // 8. Succès !
      toast.success("Connexion réussie !", {
        description: `Bienvenue ${data?.user?.user_metadata?.full_name || ''} !`,
        icon: <ShieldCheck className="h-5 w-5 text-success" />
      });
      
      navigate("/");
    } catch (error) {
      showError(error, "Connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-pcci-blue/10 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <img src={pcciLogo} alt="PCCI Logo" className="h-20 w-20 mx-auto" />
          <CardTitle className="text-2xl font-bold">PCCI Help Desk</CardTitle>
          <CardDescription>Gestion des incidents informatiques</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="votre.email@pcci.sn"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Mot de passe</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
                <div className="text-center">
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Mot de passe oublié ?
                  </Link>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-fullname">Nom complet</Label>
                  <Input
                    id="signup-fullname"
                    name="fullName"
                    type="text"
                    placeholder="Jean Dupont"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="jean.dupont@pcci.sn"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-userid">ID Utilisateur</Label>
                  <Input
                    id="signup-userid"
                    name="userId"
                    type="text"
                    placeholder="jdupont"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      disabled={loading}
                      minLength={8}
                      value={signUpPassword}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {signUpPassword && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Force du mot de passe:</span>
                        <span className={
                          passwordStrength.score >= 3 ? "text-success font-semibold" :
                          passwordStrength.score >= 2 ? "text-warning" :
                          "text-destructive"
                        }>
                          {passwordStrength.score === 0 ? "Très faible" :
                           passwordStrength.score === 1 ? "Faible" :
                           passwordStrength.score === 2 ? "Moyen" :
                           passwordStrength.score === 3 ? "Bon" : "Excellent"}
                        </span>
                      </div>
                      <Progress 
                        value={passwordStrength.score * 25} 
                        className="h-2"
                      />
                      {passwordStrength.feedback.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {passwordStrength.feedback.map((tip, i) => (
                            <li key={i}>• {tip}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Min 8 caractères, avec majuscule, minuscule et chiffre
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirmer le mot de passe</Label>
                  <Input
                    id="signup-confirm-password"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Inscription..." : "S'inscrire"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
