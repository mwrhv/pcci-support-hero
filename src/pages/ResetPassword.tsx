import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import pcciLogo from "@/assets/pcci-logo.png";
import { showError, safeAsync } from "@/utils/errorHandler";
import { checkPasswordStrength } from "@/utils/security";

const passwordSchema = z.object({
  password: z.string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" })
    .max(128, { message: "Le mot de passe ne doit pas dépasser 128 caractères" })
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre"
    ),
  confirmPassword: z.string().min(8),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    // Verify if we have a valid recovery token with error handling
    const checkSession = async () => {
      const { data: session, error } = await safeAsync(async () => {
        const result = await supabase.auth.getSession();
        if (result.error) throw result.error;
        return result.data.session;
      }, "Vérification de session");

      if (session) {
        setIsValidToken(true);
      } else {
        toast.error("Lien invalide ou expiré");
        navigate("/auth");
      }
    };

    checkSession();
  }, [navigate]);

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    try {
      // Validate password with strong requirements
      const validated = passwordSchema.parse({ password, confirmPassword });

      // Check password strength
      const strength = checkPasswordStrength(validated.password);
      if (strength.score < 3) {
        toast.error("Le mot de passe est trop faible. " + strength.feedback.join(", "));
        return;
      }

      // Update password with error handling
      const { error: updateError } = await safeAsync(async () => {
        const result = await supabase.auth.updateUser({
          password: validated.password,
        });
        if (result.error) throw result.error;
        return result;
      }, "Réinitialisation du mot de passe");

      if (updateError) {
        showError(updateError, "Réinitialisation du mot de passe");
        return;
      }

      toast.success("Mot de passe réinitialisé avec succès !");
      navigate("/auth");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        showError(error, "Réinitialisation du mot de passe");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isValidToken) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-pcci-blue/10 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <img src={pcciLogo} alt="PCCI Logo" className="h-20 w-20 mx-auto" />
          <CardTitle className="text-2xl font-bold">Nouveau mot de passe</CardTitle>
          <CardDescription>
            Entrez votre nouveau mot de passe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                disabled={loading}
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
