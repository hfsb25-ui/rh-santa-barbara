import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  UserCircle,
  LogOut,
  Shield,
  Shirt,
} from "lucide-react";
import { toast } from "sonner";

interface FuncionarioDashboardProps {
  user: User;
}

const FuncionarioDashboard = ({ user }: FuncionarioDashboardProps) => {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);
  const [epis, setEpis] = useState<any[]>([]);
  const [uniformes, setUniformes] = useState<any[]>([]);

  useEffect(() => {
    fetchEmployeeData();
  }, [user]);

  const fetchEmployeeData = async () => {
    try {
      const { data: empData } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (empData) {
        setEmployee(empData);

        const [episRes, uniformesRes] = await Promise.all([
          supabase.from("epis").select("*").eq("employee_id", empData.id),
          supabase.from("uniformes").select("*").eq("employee_id", empData.id),
        ]);

        setEpis(episRes.data || []);
        setUniformes(uniformesRes.data || []);
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair");
    } else {
      navigate("/auth");
    }
  };


  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Meu Painel</h1>
              <p className="text-sm text-muted-foreground">{employee.nome_completo}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Card de Folgas */}
          <Card>
            <CardHeader>
              <CardTitle>Folgas Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {employee.quantidade_folgas || 0} folgas
              </div>
            </CardContent>
          </Card>

          {/* EPIs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                EPIs Recebidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {epis.length === 0 ? (
                <p className="text-muted-foreground">Nenhum EPI registrado.</p>
              ) : (
                <div className="space-y-3">
                  {epis.map((epi) => (
                    <div key={epi.id} className="border-b pb-3 last:border-0">
                      <p className="font-medium">{epi.tipo_epi}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span>Qtd: {epi.quantidade}</span>
                        <span>
                          Data: {new Date(epi.data_entrega).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {epi.observacoes && (
                        <p className="text-sm mt-1">{epi.observacoes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Uniformes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shirt className="w-5 h-5" />
                Uniformes Recebidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {uniformes.length === 0 ? (
                <p className="text-muted-foreground">Nenhum uniforme registrado.</p>
              ) : (
                <div className="space-y-3">
                  {uniformes.map((uniforme) => (
                    <div key={uniforme.id} className="border-b pb-3 last:border-0">
                      <p className="font-medium">{uniforme.tipo_uniforme}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span>Tamanho: {uniforme.tamanho}</span>
                        <span>Qtd: {uniforme.quantidade}</span>
                        <span>
                          Data: {new Date(uniforme.data_entrega).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {uniforme.observacoes && (
                        <p className="text-sm mt-1">{uniforme.observacoes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default FuncionarioDashboard;
