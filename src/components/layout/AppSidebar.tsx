import {
  LayoutDashboard,
  Users,
  Shield,
  Briefcase,
  UsersRound,
  Clock,
  Calendar,
  Award,
  GraduationCap,
  ClipboardList,
  CalendarDays,
  Search as SearchIcon,
  UserPlus,
  Receipt,
  TrendingUp,
  DollarSign,
  Wallet,
  FileSignature,
  FileWarning,
  IdCard,
  Package,
  Activity,
  Building2,
  BarChart3,
  Settings,
  Bot,
  Scale,
  Calculator,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const menuGroups = [
  {
    label: "Principal",
    items: [
      { title: "Visão Geral", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Pessoas",
    items: [
      { title: "Funcionários", url: "/dashboard", icon: Users, hash: "#funcionarios" },
      { title: "Gestores", url: "/managers", icon: Shield },
      { title: "Funções", url: "/funcoes", icon: Briefcase },
      { title: "People Manager", url: "/people-manager", icon: UsersRound },
    ],
  },
  {
    label: "Operacional",
    items: [
      { title: "Controle de Ponto", url: "/controle-ponto", icon: Clock },
      { title: "Escala de Férias", url: "/vacation-schedule", icon: Calendar },
      { title: "Avaliações", url: "/avaliacoes", icon: Award },
      { title: "Treinamentos", url: "/treinamentos", icon: GraduationCap },
      { title: "Checklists", url: "/plano-admissao-desligamento", icon: ClipboardList },
      { title: "Eventos", url: "/eventos", icon: CalendarDays },
    ],
  },
  {
    label: "Recrutamento",
    items: [
      { title: "Vagas", url: "/vagas", icon: SearchIcon },
      { title: "Candidaturas", url: "/recrutamento", icon: UserPlus },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Folha de Pagamento", url: "/payroll", icon: Receipt },
      { title: "Reajuste Salarial", url: "/salary-adjustment", icon: TrendingUp },
      { title: "Adiantamentos", url: "/adiantamentos", icon: DollarSign },
      { title: "Financeiro", url: "/financeiro", icon: Wallet },
    ],
  },
  {
    label: "Documentos",
    items: [
      { title: "Contratos", url: "/contracts", icon: FileSignature },
      { title: "TACs", url: "/tacs", icon: FileWarning },
      { title: "Crachás", url: "/crachas", icon: IdCard },
      { title: "Consulta Judicial", url: "/consulta-judicial", icon: Scale },
    ],
  },
  {
    label: "Estoque",
    items: [
      { title: "EPIs / Uniformes", url: "/stock", icon: Package },
    ],
  },
  {
    label: "Saúde",
    items: [
      { title: "Saúde Ocupacional", url: "/saude-ocupacional", icon: Activity },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Empresas", url: "/companies", icon: Building2 },
      { title: "Setores", url: "/sectors", icon: Building2 },
      { title: "Turnover", url: "/turnover", icon: TrendingUp },
      { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
      { title: "Configurações", url: "/settings", icon: Settings },
    ],
  },
  {
    label: "Cérebrum IA",
    items: [
      { title: "Inteligência Artificial", url: "/ai-insights", icon: Bot },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const isActive = (url: string) => location.pathname === url;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-foreground">Cérebrum</span>
              <span className="text-xs text-sidebar-foreground/60">Sistema de RH</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        end
                        className="flex items-center gap-2"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        {!collapsed && (
          <p className="text-xs text-sidebar-foreground/50 text-center">
            RH Santa Bárbara
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
