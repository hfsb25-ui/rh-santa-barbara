import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Calendar, LayoutList, TrendingUp, Settings, ArrowLeft, Plus, FileDown, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VacationCalendar } from "@/components/vacation-schedule/VacationCalendar";
import { VacationTimeline } from "@/components/vacation-schedule/VacationTimeline";
import { VacationList } from "@/components/vacation-schedule/VacationList";
import { VacationMetrics } from "@/components/vacation-schedule/VacationMetrics";
import { VacationFilters } from "@/components/vacation-schedule/VacationFilters";
import { VacationSettings } from "@/components/vacation-schedule/VacationSettings";
import { VacationCharts } from "@/components/vacation-schedule/VacationCharts";
import { AddVacationDialog } from "@/components/vacation-schedule/AddVacationDialog";
import { ExportVacationDialog } from "@/components/vacation-schedule/ExportVacationDialog";
import type { VacationFiltersType } from "@/components/vacation-schedule/types";

export default function VacationSchedule() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<VacationFiltersType>({
    empresa: "all",
    setor: "all",
    periodo: { start: null, end: null },
    status: "all",
    search: "",
    ano: undefined,
    feriasVencidas: false,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Escala de Férias</h1>
                <p className="text-sm text-muted-foreground">
                  Planeje e visualize as férias de todos os funcionários
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowExportDialog(true)}>
                <FileDown className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Férias
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <VacationMetrics filters={filters} key={`metrics-${refreshKey}`} />

        <Card className="p-6">
          <VacationFilters filters={filters} onFiltersChange={setFilters} />
        </Card>

        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendário</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Gráficos</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configurações</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-6">
            <VacationCalendar
              filters={filters}
              onRefresh={handleRefresh}
              key={`calendar-${refreshKey}`}
            />
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <VacationTimeline
              filters={filters}
              key={`timeline-${refreshKey}`}
            />
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            <VacationList
              filters={filters}
              onRefresh={handleRefresh}
              key={`list-${refreshKey}`}
            />
          </TabsContent>

          <TabsContent value="charts" className="mt-6">
            <VacationCharts
              filters={filters}
              key={`charts-${refreshKey}`}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <VacationSettings />
          </TabsContent>
        </Tabs>
      </main>

      <AddVacationDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        selectedDate={null}
        onSuccess={() => {
          handleRefresh();
          setShowAddDialog(false);
        }}
      />

      <ExportVacationDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        filters={filters}
      />
    </div>
  );
}
