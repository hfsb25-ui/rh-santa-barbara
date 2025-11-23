import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Calendar, LayoutList, TrendingUp, Settings, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VacationCalendar } from "@/components/vacation-schedule/VacationCalendar";
import { VacationTimeline } from "@/components/vacation-schedule/VacationTimeline";
import { VacationList } from "@/components/vacation-schedule/VacationList";
import { VacationMetrics } from "@/components/vacation-schedule/VacationMetrics";
import { VacationFilters } from "@/components/vacation-schedule/VacationFilters";
import { VacationSettings } from "@/components/vacation-schedule/VacationSettings";

export interface VacationFiltersType {
  empresa: string;
  setor: string;
  periodo: { start: Date | null; end: Date | null };
  status: string;
  search: string;
}

export default function VacationSchedule() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<VacationFiltersType>({
    empresa: "all",
    setor: "all",
    periodo: { start: null, end: null },
    status: "all",
    search: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
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
                <h1 className="text-3xl font-bold text-foreground">Escala de Férias</h1>
                <p className="text-muted-foreground">
                  Planeje e visualize as férias de todos os funcionários
                </p>
              </div>
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
              Calendário
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <LayoutList className="h-4 w-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Gráficos
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
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

          <TabsContent value="metrics" className="mt-6">
            <div className="text-center text-muted-foreground py-12">
              Gráficos e análises em desenvolvimento
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <VacationSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
