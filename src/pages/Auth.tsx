import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import { User, Session } from "@supabase/supabase-js";
import { Briefcase, Bot } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyLogo = async () => {
      const { data } = await supabase
        .from("empresas")
        .select("logo_url")
        .limit(1)
        .maybeSingle();
      
      if (data?.logo_url) {
        setCompanyLogo(data.logo_url);
      }
    };

    fetchCompanyLogo();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cpfLimpo = cpf.replace(/\D/g, '')
      const prefixes = ["funcionario", "gestor", "admin"];
      let data: any = null;
      let lastError: any = null;

      for (const prefix of prefixes) {
        const email = `${prefix}.${cpfLimpo}@rhsantabarbara.app`;
        const { data: d, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) { data = d; break; }
        lastError = error;
      }

      if (!data) {
        toast.error("Erro ao fazer login", {
          description: "CPF ou senha incorretos. Verifique se o usuário foi cadastrado no sistema.",
        });
        return;
      }

      if (data.user) {
        const { data: employeeData } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", data.user.id)
          .maybeSingle();

        await supabase.from("login_history").insert({
          user_id: data.user.id,
          employee_id: employeeData?.id,
          ip_address: null,
          user_agent: navigator.userAgent,
        });
      }

      toast.success("Login realizado com sucesso!");
    } catch (error: any) {
      toast.error("Erro inesperado", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-secondary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative z-10 text-center space-y-8">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto shadow-2xl">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-white tracking-tight">Cérebrum</h1>
            <p className="text-lg text-white/70 max-w-sm mx-auto leading-relaxed">
              Sistema inteligente de gestão de recursos humanos
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center space-y-3">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="w-14 h-14 object-contain mx-auto" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto shadow-lg">
                <Bot className="w-7 h-7 text-white" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Bem-vindo</h2>
            <p className="text-muted-foreground text-sm">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="cpf" className="text-sm font-medium">CPF</Label>
              <Input
                id="cpf"
                type="text"
                placeholder="Seu CPF"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                required
                className="h-11 bg-card border-0 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-card border-0 shadow-sm"
              />
            </div>
            <Button type="submit" className="w-full h-11 text-sm font-medium shadow-md" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground/60">
            RH Santa Bárbara © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
