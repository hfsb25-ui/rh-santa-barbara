import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import EmployeeDetails from "./pages/EmployeeDetails";
import Stock from "./pages/Stock";
import Sectors from "./pages/Sectors";
import Turnover from "./pages/Turnover";
import Financeiro from "./pages/Financeiro";
import Companies from "./pages/Companies";
import Payroll from "./pages/Payroll";
import Funcoes from "./pages/Funcoes";
import Contracts from "./pages/Contracts";
import Managers from "./pages/Managers";
import SalaryAdjustment from "./pages/SalaryAdjustment";
import ControlePonto from "./pages/ControlePonto";
import NotFound from "./pages/NotFound";
import Vagas from "./pages/Vagas";
import VagaDetalhes from "./pages/VagaDetalhes";
import Recrutamento from "./pages/Recrutamento";
import CandidaturasVaga from "./pages/CandidaturasVaga";
import Relatorios from "./pages/Relatorios";
import SaudeOcupacional from "./pages/SaudeOcupacional";
import VacationSchedule from "./pages/VacationSchedule";
import Settings from "./pages/Settings";
import Avaliacoes from "./pages/Avaliacoes";
import Treinamentos from "./pages/Treinamentos";
import Adiantamentos from "./pages/Adiantamentos";
import PlanoAdmissaoDesligamento from "./pages/PlanoAdmissaoDesligamento";
import PeopleManager from "./pages/PeopleManager";
import Tacs from "./pages/Tacs";
import Crachas from "./pages/Crachas";
import Eventos from "./pages/Eventos";
import AIInsights from "./pages/AIInsights";
import ConsultaJudicial from "./pages/ConsultaJudicial";
import Contabilidade from "./pages/Contabilidade";
import AppLayout from "./components/layout/AppLayout";
import { FloatingAIChat } from "./components/ai/FloatingAIChat";

const queryClient = new QueryClient();

const App = () => {
  useSiteSettings();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <FloatingAIChat />
            <Routes>
              <Route path="/" element={<Auth />} />
              <Route path="/auth" element={<Auth />} />

              {/* All gestor routes wrapped in AppLayout */}
              <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
              <Route path="/employee/:id" element={<AppLayout><EmployeeDetails /></AppLayout>} />
              <Route path="/stock" element={<AppLayout><Stock /></AppLayout>} />
              <Route path="/sectors" element={<AppLayout><Sectors /></AppLayout>} />
              <Route path="/turnover" element={<AppLayout><Turnover /></AppLayout>} />
              <Route path="/financeiro" element={<AppLayout><Financeiro /></AppLayout>} />
              <Route path="/companies" element={<AppLayout><Companies /></AppLayout>} />
              <Route path="/payroll" element={<AppLayout><Payroll /></AppLayout>} />
              <Route path="/funcoes" element={<AppLayout><Funcoes /></AppLayout>} />
              <Route path="/contracts" element={<AppLayout><Contracts /></AppLayout>} />
              <Route path="/managers" element={<AppLayout><Managers /></AppLayout>} />
              <Route path="/salary-adjustment" element={<AppLayout><SalaryAdjustment /></AppLayout>} />
              <Route path="/vagas" element={<Vagas />} />
              <Route path="/vaga/:id" element={<VagaDetalhes />} />
              <Route path="/recrutamento" element={<AppLayout><Recrutamento /></AppLayout>} />
              <Route path="/recrutamento/vaga/:id/candidaturas" element={<AppLayout><CandidaturasVaga /></AppLayout>} />
              <Route path="/relatorios" element={<AppLayout><Relatorios /></AppLayout>} />
              <Route path="/saude-ocupacional" element={<AppLayout><SaudeOcupacional /></AppLayout>} />
              <Route path="/vacation-schedule" element={<AppLayout><VacationSchedule /></AppLayout>} />
              <Route path="/avaliacoes" element={<AppLayout><Avaliacoes /></AppLayout>} />
              <Route path="/controle-ponto" element={<AppLayout><ControlePonto /></AppLayout>} />
              <Route path="/treinamentos" element={<AppLayout><Treinamentos /></AppLayout>} />
              <Route path="/adiantamentos" element={<AppLayout><Adiantamentos /></AppLayout>} />
              <Route path="/plano-admissao-desligamento" element={<AppLayout><PlanoAdmissaoDesligamento /></AppLayout>} />
              <Route path="/people-manager" element={<AppLayout><PeopleManager /></AppLayout>} />
              <Route path="/tacs" element={<AppLayout><Tacs /></AppLayout>} />
              <Route path="/crachas" element={<AppLayout><Crachas /></AppLayout>} />
              <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
              <Route path="/eventos" element={<AppLayout><Eventos /></AppLayout>} />
              <Route path="/ai-insights" element={<AppLayout><AIInsights /></AppLayout>} />
              <Route path="/consulta-judicial" element={<AppLayout><ConsultaJudicial /></AppLayout>} />
              <Route path="/contabilidade" element={<AppLayout><Contabilidade /></AppLayout>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
