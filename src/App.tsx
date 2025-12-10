import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
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

const queryClient = new QueryClient();

const App = () => {
  // Restore site settings from localStorage on app load
  useEffect(() => {
    const savedTitle = localStorage.getItem("siteTitle");
    if (savedTitle) {
      document.title = savedTitle;
    }

    const savedFavicon = localStorage.getItem("siteFavicon");
    if (savedFavicon) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = savedFavicon;
    }
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employee/:id" element={<EmployeeDetails />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/sectors" element={<Sectors />} />
          <Route path="/turnover" element={<Turnover />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/funcoes" element={<Funcoes />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/managers" element={<Managers />} />
          <Route path="/salary-adjustment" element={<SalaryAdjustment />} />
          <Route path="/vagas" element={<Vagas />} />
          <Route path="/vaga/:id" element={<VagaDetalhes />} />
          <Route path="/recrutamento" element={<Recrutamento />} />
          <Route path="/recrutamento/vaga/:id/candidaturas" element={<CandidaturasVaga />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/saude-ocupacional" element={<SaudeOcupacional />} />
          <Route path="/vacation-schedule" element={<VacationSchedule />} />
          <Route path="/avaliacoes" element={<Avaliacoes />} />
          <Route path="/controle-ponto" element={<ControlePonto />} />
          <Route path="/treinamentos" element={<Treinamentos />} />
          <Route path="/adiantamentos" element={<Adiantamentos />} />
          <Route path="/plano-admissao-desligamento" element={<PlanoAdmissaoDesligamento />} />
            <Route path="/people-manager" element={<PeopleManager />} />
            <Route path="/tacs" element={<Tacs />} />
            <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
