import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";
import Vagas from "./pages/Vagas";
import VagaDetalhes from "./pages/VagaDetalhes";
import Recrutamento from "./pages/Recrutamento";
import CandidaturasVaga from "./pages/CandidaturasVaga";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
