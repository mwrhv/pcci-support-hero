import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Search, FileText, Calendar, User, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Fiche {
  id: string;
  code: string;
  title: string;
  created_at: string;
  metadata: any;
  category_id: string | null;
  categories: { name: string } | null;
  profiles: { full_name: string } | null;
}

export default function FichesDirectory() {
  const navigate = useNavigate();
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCampagne, setSelectedCampagne] = useState<string>("all");
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const allowedCategories = ["Démission", "Retour Matériel", "Départ Télétravail"];
      
      // Fetch only allowed categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .in("name", allowedCategories)
        .order("name");
      
      if (categoriesData) setCategories(categoriesData);

      // Get category IDs for filtering
      const categoryIds = categoriesData?.map(cat => cat.id) || [];

      // Fetch fiches (tickets with metadata) only for allowed categories
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id,
          code,
          title,
          created_at,
          metadata,
          category_id,
          categories:category_id(name),
          profiles!tickets_requester_id_fkey(full_name)
        `)
        .not("metadata", "is", null)
        .or(`category_id.in.(${categoryIds.join(',')}),and(category_id.is.null,metadata->>type.in.(Fiche Retour Matériel,Fiche Départ Télétravail,Fiche Démission))`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFiches(data || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des fiches");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour normaliser les numéros de téléphone
  const normalizePhoneNumber = (phone: string | undefined | null): string => {
    if (!phone) return '';
    // Supprimer tous les caractères non-numériques
    const digitsOnly = phone.replace(/\D/g, '');
    // Supprimer le préfixe 221 s'il existe
    return digitsOnly.replace(/^221/, '');
  };

  // Fonction pour rechercher dans tous les champs d'une fiche
  const searchInAllFields = (fiche: Fiche, searchQuery: string): boolean => {
    const lowerQuery = searchQuery.toLowerCase();
    const normalizedQuery = normalizePhoneNumber(searchQuery);
    
    // Recherche dans les champs standards
    if (
      fiche.code.toLowerCase().includes(lowerQuery) ||
      fiche.title.toLowerCase().includes(lowerQuery)
    ) {
      return true;
    }

    // Recherche dans les metadata
    if (fiche.metadata) {
      // Parcourir tous les champs de metadata
      for (const [key, value] of Object.entries(fiche.metadata)) {
        if (value === null || value === undefined) continue;
        
        const stringValue = String(value).toLowerCase();
        
        // Recherche textuelle classique
        if (stringValue.includes(lowerQuery)) {
          return true;
        }
        
        // Recherche spécifique pour les numéros de téléphone
        // Si le champ contient "tel", "phone", "sim" ou "numero"
        if (
          key.toLowerCase().includes('tel') ||
          key.toLowerCase().includes('phone') ||
          key.toLowerCase().includes('sim') ||
          key.toLowerCase().includes('numero')
        ) {
          const normalizedValue = normalizePhoneNumber(String(value));
          if (normalizedValue.includes(normalizedQuery)) {
            return true;
          }
        }
        
        // Vérifier aussi si la valeur ressemble à un numéro (contient beaucoup de chiffres)
        const digitCount = String(value).replace(/\D/g, '').length;
        if (digitCount >= 7) { // Un numéro de téléphone a généralement au moins 7 chiffres
          const normalizedValue = normalizePhoneNumber(String(value));
          if (normalizedValue.includes(normalizedQuery)) {
            return true;
          }
        }
      }
    }
    
    return false;
  };

  const filteredFiches = fiches.filter((fiche) => {
    const matchesSearch = searchTerm === '' || searchInAllFields(fiche, searchTerm);

    const matchesCategory = selectedCategory === "all" || (() => {
      // Si la fiche a un category_id, vérifier s'il correspond
      if (fiche.category_id === selectedCategory) return true;
      
      // Sinon, vérifier le metadata.type pour les fiches sans category_id
      if (!fiche.category_id && fiche.metadata?.type) {
        const selectedCat = categories.find(cat => cat.id === selectedCategory);
        if (!selectedCat) return false;
        
        // Mapper les noms de catégories aux types de metadata
        const typeMapping: Record<string, string> = {
          "Démission": "Fiche Démission",
          "Retour Matériel": "Fiche Retour Matériel",
          "Départ Télétravail": "Fiche Départ Télétravail"
        };
        
        return fiche.metadata.type === typeMapping[selectedCat.name];
      }
      
      return false;
    })();

    const matchesCampagne = 
      selectedCampagne === "all" || fiche.metadata?.campagne === selectedCampagne;

    return matchesSearch && matchesCategory && matchesCampagne;
  });

  // Get statistics
  const stats = {
    total: fiches.length,
    byCategory: categories.reduce((acc, cat) => {
      // Mapper les noms de catégories aux types de metadata
      const typeMapping: Record<string, string> = {
        "Démission": "Fiche Démission",
        "Retour Matériel": "Fiche Retour Matériel",
        "Départ Télétravail": "Fiche Départ Télétravail"
      };
      
      acc[cat.name] = fiches.filter(f => 
        f.category_id === cat.id || 
        (!f.category_id && f.metadata?.type === typeMapping[cat.name])
      ).length;
      return acc;
    }, {} as Record<string, number>),
    byCampagne: ["ORANGE", "YAS", "EXPRESSO", "CANAL"].reduce((acc, camp) => {
      acc[camp] = fiches.filter(f => f.metadata?.campagne === camp).length;
      return acc;
    }, {} as Record<string, number>),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Chargement des fiches...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Répertoire des Fiches</h1>
          <p className="text-muted-foreground">
            Explorez et filtrez toutes les fiches par catégorie et campagne
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Fiches</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          {categories.slice(0, 3).map((cat) => (
            <Card key={cat.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{cat.name}</p>
                    <p className="text-2xl font-bold">{stats.byCategory[cat.name] || 0}</p>
                  </div>
                  <FolderOpen className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par code, nom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les catégories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCampagne} onValueChange={setSelectedCampagne}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les campagnes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les campagnes</SelectItem>
                  <SelectItem value="ORANGE">ORANGE</SelectItem>
                  <SelectItem value="YAS">YAS</SelectItem>
                  <SelectItem value="EXPRESSO">EXPRESSO</SelectItem>
                  <SelectItem value="CANAL">CANAL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="text-sm text-muted-foreground mb-4">
          {filteredFiches.length} fiche{filteredFiches.length > 1 ? "s" : ""} trouvée{filteredFiches.length > 1 ? "s" : ""}
        </div>

        <div className="grid gap-4">
          {filteredFiches.map((fiche) => (
            <Card
              key={fiche.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate(`/tickets/${fiche.id}`)}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono">
                        {fiche.code}
                      </Badge>
                      {fiche.categories && (
                        <Badge variant="secondary">
                          {fiche.categories.name}
                        </Badge>
                      )}
                      {fiche.metadata?.campagne && (
                        <Badge>
                          {fiche.metadata.campagne}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{fiche.title}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {fiche.metadata?.prenom && fiche.metadata?.nom && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {fiche.metadata.prenom} {fiche.metadata.nom}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(fiche.created_at), "dd MMM yyyy", { locale: fr })}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredFiches.length === 0 && (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucune fiche trouvée</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
