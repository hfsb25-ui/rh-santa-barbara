import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { toast } from "sonner";
import { User, Session } from "@supabase/supabase-js";
import { Briefcase } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
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
      // Formatar CPF para criar email no mesmo formato da edge function
      const cpfLimpo = cpf.replace(/\D/g, '')
      const email = `funcionario.${cpfLimpo}@rhsantabarbara.app`;
      
      console.log("Tentando login com:", { cpf: cpfLimpo, email });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Erro de login:", error);
        toast.error("Erro ao fazer login", {
          description: "CPF ou senha incorretos. Verifique se o funcionário foi cadastrado no sistema.",
        });
        return;
      }

      // Registrar login no histórico
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-2">
            <Briefcase className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Sistema de RH</CardTitle>
          <CardDescription>
            Gerencie funcionários, EPIs, férias e muito mais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                type="text"
                placeholder="Seu CPF"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
