import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import pcciLogo from "@/assets/pcci-logo.png";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

interface PrintPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  ficheData: {
    code: string;
    title: string;
    metadata: any;
    description: string;
    status?: string;
    priority?: string;
    assignee?: {
      id: string;
      full_name: string;
      email: string;
      department?: string;
    } | null;
  };
}

export function PrintPreview({ isOpen, onClose, ficheData }: PrintPreviewProps) {
  const metadata = ficheData.metadata || {};
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Fiche_${ficheData.code}`,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <VisuallyHidden>
          <DialogTitle>Aperçu avant impression</DialogTitle>
        </VisuallyHidden>
        
        {/* Barre d'actions */}
        <div className="no-print sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold">Aperçu avant impression</h2>
          <div className="flex gap-2">
            <Button onClick={handlePrint} size="sm">
              <Printer className="mr-2 h-4 w-4" />
              Imprimer
            </Button>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Zone d'impression */}
        <div ref={componentRef} className="bg-white p-6">
          <style>
            {`
              @media print {
                @page {
                  size: A4;
                  margin: 10mm;
                }
                body {
                  print-color-adjust: exact;
                  -webkit-print-color-adjust: exact;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}
          </style>
          {/* En-tête avec logo */}
          <div className="flex items-start justify-between mb-4 pb-3 border-b-2 border-gray-800">
            <img src={pcciLogo} alt="PCCI Logo" className="h-12 w-auto" />
            <div className="text-right">
              <h1 className="text-lg font-bold text-gray-900 mb-0.5">
                {metadata.type || "Fiche"}
              </h1>
              <p className="text-xs text-gray-600">
                Réf: <span className="font-semibold">{ficheData.code}</span>
              </p>
              <p className="text-xs text-gray-500">
                {new Date().toLocaleDateString("fr-FR")}
              </p>
            </div>
          </div>

          {/* Informations du conseiller */}
          {(metadata.utilisateur || metadata.email || metadata.departement) && (
            <div className="mb-3">
              <h2 className="text-sm font-bold text-gray-900 mb-2 pb-1 border-b border-gray-300">
                Informations du conseiller
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {metadata.utilisateur && (
                  <div className="border border-gray-200 rounded p-1.5">
                    <p className="text-xs font-semibold text-gray-600">Nom</p>
                    <p className="text-xs text-gray-900">{metadata.utilisateur}</p>
                  </div>
                )}
                {metadata.email && (
                  <div className="border border-gray-200 rounded p-1.5">
                    <p className="text-xs font-semibold text-gray-600">Email</p>
                    <p className="text-xs text-gray-900">{metadata.email}</p>
                  </div>
                )}
                {metadata.departement && (
                  <div className="border border-gray-200 rounded p-1.5">
                    <p className="text-xs font-semibold text-gray-600">Dept</p>
                    <p className="text-xs text-gray-900">{metadata.departement}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Informations principales */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {metadata.campagne && (
              <div className="border border-gray-300 rounded p-1.5 bg-gray-50">
                <p className="text-xs font-bold text-gray-700 uppercase">
                  Campagne
                </p>
                <p className="text-xs font-semibold text-gray-900">{metadata.campagne}</p>
              </div>
            )}
            
            {metadata.fonction && (
              <div className="border border-gray-300 rounded p-1.5 bg-gray-50">
                <p className="text-xs font-bold text-gray-700 uppercase">
                  Fonction
                </p>
                <p className="text-xs font-semibold text-gray-900">{metadata.fonction}</p>
              </div>
            )}

            {metadata.type_mouvement && (
              <div className="border border-gray-300 rounded p-1.5 bg-gray-50">
                <p className="text-xs font-bold text-gray-700 uppercase">
                  Type
                </p>
                <p className="text-xs font-semibold text-gray-900">{metadata.type_mouvement}</p>
              </div>
            )}
          </div>

          {/* Informations personnelles */}
          <div className="mb-3">
            <h2 className="text-sm font-bold text-gray-900 mb-2 pb-1 border-b border-gray-300">
              Informations personnelles
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {metadata.prenom && (
                <div className="border border-gray-200 rounded p-1.5">
                  <p className="text-xs font-semibold text-gray-600">Prénom</p>
                  <p className="text-xs text-gray-900">{metadata.prenom}</p>
                </div>
              )}
              {metadata.nom && (
                <div className="border border-gray-200 rounded p-1.5">
                  <p className="text-xs font-semibold text-gray-600">Nom</p>
                  <p className="text-xs text-gray-900">{metadata.nom}</p>
                </div>
              )}
              {metadata.id_personnel && (
                <div className="border border-gray-200 rounded p-1.5">
                  <p className="text-xs font-semibold text-gray-600">ID</p>
                  <p className="text-xs text-gray-900">{metadata.id_personnel}</p>
                </div>
              )}
              {metadata.cni && (
                <div className="border border-gray-200 rounded p-1.5">
                  <p className="text-xs font-semibold text-gray-600">CNI</p>
                  <p className="text-xs text-gray-900">{metadata.cni}</p>
                </div>
              )}
              {metadata.telephone && (
                <div className="border border-gray-200 rounded p-1.5">
                  <p className="text-xs font-semibold text-gray-600">Tél</p>
                  <p className="text-xs text-gray-900">{metadata.telephone}</p>
                </div>
              )}
            </div>
            
            {metadata.demeurant && (
              <div className="border border-gray-200 rounded p-1.5 mt-2">
                <p className="text-xs font-semibold text-gray-600">Adresse</p>
                <p className="text-xs text-gray-900">{metadata.demeurant}</p>
              </div>
            )}
          </div>

          {/* Informations matériel (si présentes) */}
          {(metadata.nom_machine || metadata.place || metadata.numero_sim) && (
            <div className="mb-3">
              <h2 className="text-sm font-bold text-gray-900 mb-2 pb-1 border-b border-gray-300">
                Informations matériel
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {metadata.nom_machine && (
                  <div className="border border-gray-200 rounded p-1.5">
                    <p className="text-xs font-semibold text-gray-600">Machine</p>
                    <p className="text-xs text-gray-900">{metadata.nom_machine}</p>
                  </div>
                )}
                {metadata.place && (
                  <div className="border border-gray-200 rounded p-1.5">
                    <p className="text-xs font-semibold text-gray-600">Place</p>
                    <p className="text-xs text-gray-900">{metadata.place}</p>
                  </div>
                )}
                {metadata.numero_sim && (
                  <div className="border border-gray-200 rounded p-1.5">
                    <p className="text-xs font-semibold text-gray-600">N° SIM</p>
                    <p className="text-xs text-gray-900">{metadata.numero_sim}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Informations de démission (si présentes) */}
          {(metadata.date_demission || metadata.motif) && (
            <div className="mb-3">
              <h2 className="text-sm font-bold text-gray-900 mb-2 pb-1 border-b border-gray-300">
                Démission
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {metadata.date_demission && (
                  <div className="border border-gray-200 rounded p-1.5">
                    <p className="text-xs font-semibold text-gray-600">Date</p>
                    <p className="text-xs text-gray-900">
                      {new Date(metadata.date_demission).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                )}
                {metadata.motif && (
                  <div className="border border-gray-200 rounded p-1.5">
                    <p className="text-xs font-semibold text-gray-600">Motif</p>
                    <p className="text-xs text-gray-900 line-clamp-2">{metadata.motif}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Informations de prise en charge */}
          {ficheData.assignee && (
            <div className="mb-3">
              <h2 className="text-sm font-bold text-gray-900 mb-2 pb-1 border-b border-gray-300">
                Pris en charge par
              </h2>
              <div className="grid grid-cols-3 gap-2">
                <div className="border border-gray-200 rounded p-1.5">
                  <p className="text-xs font-semibold text-gray-600">Nom</p>
                  <p className="text-xs text-gray-900">{ficheData.assignee.full_name}</p>
                </div>
                <div className="border border-gray-200 rounded p-1.5">
                  <p className="text-xs font-semibold text-gray-600">Email</p>
                  <p className="text-xs text-gray-900">{ficheData.assignee.email}</p>
                </div>
                {ficheData.assignee.department && (
                  <div className="border border-gray-200 rounded p-1.5">
                    <p className="text-xs font-semibold text-gray-600">Fonction</p>
                    <p className="text-xs text-gray-900">{ficheData.assignee.department}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {ficheData.description && (
            <div className="mb-3">
              <h2 className="text-sm font-bold text-gray-900 mb-2 pb-1 border-b border-gray-300">
                Description
              </h2>
              <div className="border border-gray-200 rounded p-2 bg-gray-50">
                <p className="text-xs text-gray-900 whitespace-pre-wrap leading-tight">
                  {ficheData.description}
                </p>
              </div>
            </div>
          )}

          {/* Pied de page */}
          <div className="mt-3 pt-2 border-t border-gray-300 text-center">
            <p className="text-xs text-gray-500">
              {new Date().toLocaleDateString("fr-FR")} - {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
