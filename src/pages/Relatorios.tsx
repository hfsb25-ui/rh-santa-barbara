import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  FileText,
  Package,
  DollarSign,
  Briefcase,
  BarChart3,
} from "lucide-react";
import EmployeeReports from "@/components/relatorios/reports/EmployeeReports";
import AttendanceReports from "@/components/relatorios/reports/AttendanceReports";
import StockReports from "@/components/relatorios/reports/StockReports";
import FinancialReports from "@/components/relatorios/reports/FinancialReports";
import RecruitmentReports from "@/components/relatorios/reports/RecruitmentReports";

const Relatorios = () => {
  const [activeTab, setActiveTab] = useState("employees");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="w-8 h-8" />
          Central de Relatórios
        </h1>
        <p className="text-muted-foreground mt-2">
          Gere e exporte relatórios detalhados do sistema
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="inline-flex lg:grid w-full lg:grid-cols-5 overflow-x-auto tabs-scroll">
          <TabsTrigger
            value="employees"
            className="flex items-center gap-2 flex-shrink-0 min-w-fit"
          >
            <Users className="w-4 h-4" />
            Funcionários
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            className="flex items-center gap-2 flex-shrink-0 min-w-fit"
          >
            <FileText className="w-4 h-4" />
            Frequência
          </TabsTrigger>
          <TabsTrigger
            value="stock"
            className="flex items-center gap-2 flex-shrink-0 min-w-fit"
          >
            <Package className="w-4 h-4" />
            EPIs/Uniformes
          </TabsTrigger>
          <TabsTrigger
            value="financial"
            className="flex items-center gap-2 flex-shrink-0 min-w-fit"
          >
            <DollarSign className="w-4 h-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger
            value="recruitment"
            className="flex items-center gap-2 flex-shrink-0 min-w-fit"
          >
            <Briefcase className="w-4 h-4" />
            Recrutamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <EmployeeReports />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceReports />
        </TabsContent>

        <TabsContent value="stock">
          <StockReports />
        </TabsContent>

        <TabsContent value="financial">
          <FinancialReports />
        </TabsContent>

        <TabsContent value="recruitment">
          <RecruitmentReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Relatorios;
