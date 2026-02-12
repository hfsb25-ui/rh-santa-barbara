import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("all");
  const [empresas, setEmpresas] = useState<Array<{ id: string; nome: string; logo_url?: string }>>([]);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") navigate("/auth");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchRole = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      setUserRole(data?.role || null);
      setLoading(false);
    };
    fetchRole();
  }, [user]);

  useEffect(() => {
    const fetchEmpresas = async () => {
      const { data } = await supabase.from("empresas").select("id, nome, logo_url").order("nome");
      if (data) {
        setEmpresas(data);
        if (selectedEmpresa !== "all") {
          const sel = data.find((e) => e.id === selectedEmpresa);
          setCompanyLogo(sel?.logo_url || null);
        } else if (data.length > 0) {
          setCompanyLogo(data[0].logo_url || null);
        }
      }
    };
    if (user) fetchEmpresas();
  }, [user, selectedEmpresa]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error("Erro ao sair");
    else navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Acesso não autorizado</h1>
          <p className="text-muted-foreground">
            Seu usuário ainda não possui uma função atribuída. Entre em contato com o administrador.
          </p>
        </div>
      </div>
    );
  }

  // Funcionário dashboard doesn't use sidebar
  if (userRole !== "gestor") {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              {companyLogo && (
                <img src={companyLogo} alt="Logo" className="w-8 h-8 object-contain" />
              )}
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto p-6">
            {typeof children === "function"
              ? (children as any)({ selectedEmpresa, empresas, user })
              : children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
