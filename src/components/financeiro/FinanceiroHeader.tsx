import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FinanceiroHeaderProps {
  onExportPDF: () => void;
  onExportExcel: () => void;
}

export function FinanceiroHeader({ onExportPDF, onExportExcel }: FinanceiroHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Controle Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Análise completa de gastos com pessoal
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onExportPDF}>
          <Download className="h-4 w-4 mr-2" />
          PDF
        </Button>
        <Button variant="outline" onClick={onExportExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
        </Button>
      </div>
    </div>
  );
}
