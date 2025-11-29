import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { format } from "date-fns";

const TIPO_DIA_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "abonado", label: "Abonado" },
  { value: "falta", label: "Falta" },
  { value: "ferias", label: "Férias" },
  { value: "atestado", label: "Atestado" },
];

export function LancamentoPonto() {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [horaEntrada, setHoraEntrada] = useState("");
  const [horaSaida, setHoraSaida] = useState("");
  const [horaInicioIntervalo, setHoraInicioIntervalo] = useState("");
  const [horaFimIntervalo, setHoraFimIntervalo] = useState("");
  const [tipoDia, setTipoDia] = useState("normal");
  const [observacoes, setObservacoes] = useState("");
  const queryClient = useQueryClient();

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees-for-ponto"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, nome_completo, cargo")
        .eq("status", "ativo")
        .order("nome_completo");
      
      if (error) throw error;
      return data;
    },
  });

  const calculateHours = () => {
    if (!horaEntrada || !horaSaida) return 0;
    
    const [entradaH, entradaM] = horaEntrada.split(":").map(Number);
    const [saidaH, saidaM] = horaSaida.split(":").map(Number);
    
    let totalMinutos = (saidaH * 60 + saidaM) - (entradaH * 60 + entradaM);
    
    // Descontar intervalo se fornecido
    if (horaInicioIntervalo && horaFimIntervalo) {
      const [inicioH, inicioM] = horaInicioIntervalo.split(":").map(Number);
      const [fimH, fimM] = horaFimIntervalo.split(":").map(Number);
      const intervaloMinutos = (fimH * 60 + fimM) - (inicioH * 60 + inicioM);
      totalMinutos -= intervaloMinutos;
    }
    
    return (totalMinutos / 60).toFixed(2);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const horasTrabalhadas = tipoDia === "normal" ? parseFloat(calculateHours().toString()) : 0;
      
      const { error } = await supabase
        .from("registros_ponto")
        .upsert({
          employee_id: selectedEmployee,
          data,
          hora_entrada: tipoDia === "normal" ? horaEntrada || null : null,
          hora_saida: tipoDia === "normal" ? horaSaida || null : null,
          hora_inicio_intervalo: tipoDia === "normal" ? horaInicioIntervalo || null : null,
          hora_fim_intervalo: tipoDia === "normal" ? horaFimIntervalo || null : null,
          horas_trabalhadas: horasTrabalhadas,
          tipo_dia: tipoDia,
          observacoes: observacoes || null,
          created_by: user?.id,
        }, {
          onConflict: "employee_id,data"
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro de ponto salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["registros-ponto"] });
      // Limpar campos após salvar
      setHoraEntrada("");
      setHoraSaida("");
      setHoraInicioIntervalo("");
      setHoraFimIntervalo("");
      setObservacoes("");
      setTipoDia("normal");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar registro: " + error.message);
    },
  });

  const horasCalculadas = calculateHours();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Lançamento Individual</h2>
        <p className="text-muted-foreground">
          Registre o ponto de um funcionário para um dia específico
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="employee">Funcionário *</Label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o funcionário" />
            </SelectTrigger>
            <SelectContent>
              {loadingEmployees ? (
                <SelectItem value="loading" disabled>Carregando...</SelectItem>
              ) : (
                employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.nome_completo} - {emp.cargo}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="data">Data *</Label>
          <Input
            id="data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipoDia">Tipo de Dia *</Label>
          <Select value={tipoDia} onValueChange={setTipoDia}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPO_DIA_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {tipoDia === "normal" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="horaEntrada">Hora de Entrada</Label>
              <Input
                id="horaEntrada"
                type="time"
                value={horaEntrada}
                onChange={(e) => setHoraEntrada(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horaSaida">Hora de Saída</Label>
              <Input
                id="horaSaida"
                type="time"
                value={horaSaida}
                onChange={(e) => setHoraSaida(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horaInicioIntervalo">Início do Intervalo</Label>
              <Input
                id="horaInicioIntervalo"
                type="time"
                value={horaInicioIntervalo}
                onChange={(e) => setHoraInicioIntervalo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horaFimIntervalo">Fim do Intervalo</Label>
              <Input
                id="horaFimIntervalo"
                type="time"
                value={horaFimIntervalo}
                onChange={(e) => setHoraFimIntervalo(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-lg font-semibold">
                Horas Trabalhadas: {horasCalculadas}h
              </Label>
            </div>
          </>
        )}

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea
            id="observacoes"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Observações adicionais..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!selectedEmployee || !data || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Registro
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
