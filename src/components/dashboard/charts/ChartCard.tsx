import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { useRef } from "react";

interface ChartCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  showExport?: boolean;
  showFullscreen?: boolean;
}

const ChartCard = ({ title, icon, children, showExport = true, showFullscreen = true }: ChartCardProps) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!chartRef.current) return;

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      
      const link = document.createElement("a");
      link.download = `${title.replace(/\s+/g, "_")}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast.success("Gráfico exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar gráfico");
      console.error(error);
    }
  };

  return (
    <Card ref={chartRef}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
        <div className="flex gap-1">
          {showExport && (
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={handleExport}>
              <Download className="w-4 h-4" />
            </Button>
          )}
          {showFullscreen && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[90vh]">
                <DialogHeader>
                  <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="h-full overflow-auto">
                  {children}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export default ChartCard;
