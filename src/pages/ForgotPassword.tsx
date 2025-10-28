import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import pcciLogo from "@/assets/pcci-logo.png";

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Email invalide" }).max(255),
});

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      // Validate and sanitize email
      const validated = emailSchema.parse({ email });
      const sanitizedEmail = sanitizeEmail(validated.email);

      // Rate limiting (5 attempts per 5 minutes)
      checkRateLimit(authRateLimiter, sanitizedEmail, "Trop de tentatives de réinitialisation. Veuillez réessayer dans quelques minutes.");

      // Send reset email with error handling
      const { error: resetError } = await safeAsync(async () => {
        const result = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (result.error) throw result.error;
        return result;
      }, "Réinitialisation du mot de passe");

      if (resetError) {
        showError(resetError, "Réinitialisation du mot de passe");
        return;
      }

      setEmailSent(true);
      toast.success("Email envoyé ! Vérifiez votre boîte de réception.");
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-pcci-blue/10 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <img src={pcciLogo} alt="PCCI Logo" className="h-20 w-20 mx-auto" />
          <CardTitle className="text-2xl font-bold">Mot de passe oublié</CardTitle>
          <CardDescription>
            {emailSent 
              ? "Un email de réinitialisation a été envoyé"
              : "Entrez votre email pour réinitialiser votre mot de passe"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="space-y-4 text-center">
              <Mail className="h-16 w-16 mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                Si un compte existe avec cette adresse email, vous recevrez un lien de réinitialisation.
              </p>
              <Link to="/auth">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour à la connexion
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="votre.email@pcci.com"
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Envoi..." : "Envoyer le lien"}
              </Button>
              <Link to="/auth">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour à la connexion
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
