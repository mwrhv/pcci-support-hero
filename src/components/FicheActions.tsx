import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Mail, Share2 } from "lucide-react";
import { toast } from "sonner";

interface FicheActionsProps {
  isOpen: boolean;
  onClose: () => void;
  ficheData: {
    code: string;
    title: string;
    metadata: any;
    description: string;
  };
}

export function FicheActions({ isOpen, onClose, ficheData }: FicheActionsProps) {
  const formatFicheContent = () => {
    const { code, title, metadata, description } = ficheData;
    
    return `
FICHE: ${code}
${title}

CAMPAGNE: ${metadata?.campagne || 'N/A'}
TYPE: ${metadata?.type_mouvement || 'N/A'}

INFORMATIONS PERSONNELLES:
- Prénom: ${metadata?.prenom || 'N/A'}
- Nom: ${metadata?.nom || 'N/A'}
- ID: ${metadata?.id_personnel || 'N/A'}
- CNI: ${metadata?.cni || 'N/A'}
- Demeurant: ${metadata?.demeurant || 'N/A'}

INFORMATIONS MATÉRIEL:
- Nom Machine: ${metadata?.nom_machine || 'N/A'}
- Place: ${metadata?.place || 'N/A'}
- Numéro SIM: ${metadata?.numero_sim || 'N/A'}

DESCRIPTION:
${description}
    `.trim();
  };

  const handlePrint = () => {
    const content = formatFicheContent();
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Impression - ${ficheData.code}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 40px;
                line-height: 1.6;
              }
              h1 {
                color: #333;
                border-bottom: 2px solid #333;
                padding-bottom: 10px;
              }
              h2 {
                color: #666;
                margin-top: 20px;
              }
              pre {
                white-space: pre-wrap;
                font-family: Arial, sans-serif;
              }
            </style>
          </head>
          <body>
            <pre>${content}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      toast.success("Aperçu d'impression ouvert");
    }
  };

  const handleEmail = () => {
    const content = formatFicheContent();
    const subject = encodeURIComponent(`Fiche ${ficheData.code} - ${ficheData.title}`);
    const body = encodeURIComponent(content);
    
    window.open(`mailto:?subject=${subject}&body=${body}`);
    toast.success("Client email ouvert");
  };

  const handleWhatsApp = () => {
    const content = formatFicheContent();
    const encodedText = encodeURIComponent(content);
    
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    toast.success("WhatsApp ouvert");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fiche créée avec succès !</DialogTitle>
          <DialogDescription>
            Code: {ficheData.code}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={handlePrint}
            variant="outline"
            className="w-full justify-start"
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimer la fiche
          </Button>
          
          <Button
            onClick={handleEmail}
            variant="outline"
            className="w-full justify-start"
          >
            <Mail className="mr-2 h-4 w-4" />
            Partager par Email
          </Button>
          
          <Button
            onClick={handleWhatsApp}
            variant="outline"
            className="w-full justify-start"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Partager par WhatsApp
          </Button>

          <Button
            onClick={onClose}
            className="w-full mt-2"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
