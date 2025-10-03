import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import TicketsList from "./pages/TicketsList";
import NewTicket from "./pages/NewTicket";
import FicheRetourMateriel from "./pages/FicheRetourMateriel";
import FicheDepartTeletravail from "./pages/FicheDepartTeletravail";
import FicheDemission from "./pages/FicheDemission";
import FichesDirectory from "./pages/FichesDirectory";
import TicketDetail from "./pages/TicketDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthGuard>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/tickets" element={<TicketsList />} />
            <Route path="/tickets/new" element={<NewTicket />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/fiche-retour-materiel" element={<FicheRetourMateriel />} />
            <Route path="/fiche-depart-teletravail" element={<FicheDepartTeletravail />} />
            <Route path="/fiche-demission" element={<FicheDemission />} />
            <Route path="/fiches" element={<FichesDirectory />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthGuard>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
