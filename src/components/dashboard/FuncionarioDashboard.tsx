import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserCircle,
  LogOut,
  Shield,
  Calendar,
  FileText,
  Shirt,
  AlertCircle,
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
  const [ferias, setFerias] = useState<any[]>([]);
  const [faltas, setFaltas] = useState<any[]>([]);
  const [afastamentos, setAfastamentos] = useState<any[]>([]);
  const [folgas, setFolgas] = useState<any[]>([]);

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

        const [episRes, uniformesRes, feriasRes, faltasRes, afastamentosRes, folgasRes] =
          await Promise.all([
            supabase.from("epis").select("*").eq("employee_id", empData.id),
            supabase.from("uniformes").select("*").eq("employee_id", empData.id),
            supabase.from("ferias").select("*").eq("employee_id", empData.id),
            supabase.from("faltas").select("*").eq("employee_id", empData.id),
            supabase.from("afastamentos").select("*").eq("employee_id", empData.id),
            supabase.from("folgas").select("*").eq("employee_id", empData.id),
          ]);

        setEpis(episRes.data || []);
        setUniformes(uniformesRes.data || []);
        setFerias(feriasRes.data || []);
        setFaltas(faltasRes.data || []);
        setAfastamentos(afastamentosRes.data || []);
        setFolgas(folgasRes.data || []);
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

  const getStatusBadge = (status: string) => {
    const variants: any = {
      ativo: "default",
      ferias: "secondary",
      afastado: "destructive",
      demitido: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
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

      <div className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Cargo</p>
              <p className="font-medium">{employee.cargo}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Setor</p>
              <p className="font-medium">{employee.setor || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              {getStatusBadge(employee.status)}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data de Admissão</p>
              <p className="font-medium">
                {employee.data_admissao
                  ? new Date(employee.data_admissao).toLocaleDateString("pt-BR")
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="epis" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="epis">EPIs</TabsTrigger>
            <TabsTrigger value="uniformes">Uniformes</TabsTrigger>
            <TabsTrigger value="ferias">Férias</TabsTrigger>
            <TabsTrigger value="faltas">Faltas</TabsTrigger>
            <TabsTrigger value="afastamentos">Afastamentos</TabsTrigger>
            <TabsTrigger value="folgas">Folgas</TabsTrigger>
          </TabsList>

          <TabsContent value="epis" className="mt-4">
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
          </TabsContent>

          <TabsContent value="uniformes" className="mt-4">
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
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ferias" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Histórico de Férias
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ferias.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma féria registrada.</p>
                ) : (
                  <div className="space-y-3">
                    {ferias.map((feria) => (
                      <div key={feria.id} className="border-b pb-3 last:border-0">
                        <p className="font-medium">
                          {new Date(feria.periodo_gozo_inicio).toLocaleDateString("pt-BR")} até{" "}
                          {new Date(feria.periodo_gozo_fim).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {feria.dias_totais} dias
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faltas" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Faltas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {faltas.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma falta registrada.</p>
                ) : (
                  <div className="space-y-3">
                    {faltas.map((falta) => (
                      <div key={falta.id} className="border-b pb-3 last:border-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">
                            {new Date(falta.data).toLocaleDateString("pt-BR")}
                          </p>
                          <Badge variant={falta.justificada ? "default" : "destructive"}>
                            {falta.justificada ? "Justificada" : "Não justificada"}
                          </Badge>
                        </div>
                        {falta.motivo && (
                          <p className="text-sm text-muted-foreground mt-1">{falta.motivo}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="afastamentos" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Afastamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {afastamentos.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum afastamento registrado.</p>
                ) : (
                  <div className="space-y-3">
                    {afastamentos.map((afastamento) => (
                      <div key={afastamento.id} className="border-b pb-3 last:border-0">
                        <p className="font-medium">
                          {new Date(afastamento.data_inicio).toLocaleDateString("pt-BR")} até{" "}
                          {new Date(afastamento.data_fim).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="text-sm mt-1">{afastamento.motivo}</p>
                        {afastamento.cid && (
                          <p className="text-sm text-muted-foreground">CID: {afastamento.cid}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="folgas" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Folgas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {folgas.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma folga registrada.</p>
                ) : (
                  <div className="space-y-3">
                    {folgas.map((folga) => (
                      <div key={folga.id} className="border-b pb-3 last:border-0">
                        <p className="font-medium">
                          {new Date(folga.data).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="text-sm text-muted-foreground">{folga.motivo}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FuncionarioDashboard;
