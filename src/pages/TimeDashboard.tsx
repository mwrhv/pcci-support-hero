import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { BarChart3, AlertCircle } from "lucide-react";

export default function TimeDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard since time management tables don't exist yet
    navigate("/");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Tableau de Bord Temps
            </CardTitle>
            <CardDescription>
              Vue d'ensemble des temps de travail
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <p className="text-center text-muted-foreground">
                Le tableau de bord temps n'est pas encore configuré.
              </p>
              <Button onClick={() => navigate("/")}>
                Retour au tableau de bord
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
