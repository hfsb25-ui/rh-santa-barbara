import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface ExportButtonsProps {
  onExportPDF: () => void;
  onExportExcel: () => void;
  disabled?: boolean;
}

const ExportButtons = ({
  onExportPDF,
  onExportExcel,
  disabled = false,
}: ExportButtonsProps) => {
  const handleExportPDF = () => {
    try {
      onExportPDF();
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar relatório PDF");
      console.error(error);
    }
  };

  const handleExportExcel = () => {
    try {
      onExportExcel();
      toast.success("Relatório Excel gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar relatório Excel");
      console.error(error);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleExportPDF}
        disabled={disabled}
        variant="outline"
        className="flex items-center gap-2"
      >
        <FileDown className="w-4 h-4" />
        Exportar PDF
      </Button>
      <Button
        onClick={handleExportExcel}
        disabled={disabled}
        variant="outline"
        className="flex items-center gap-2"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Exportar Excel
      </Button>
    </div>
  );
};

export default ExportButtons;
