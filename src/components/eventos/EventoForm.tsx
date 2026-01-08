import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { Loader2 } from "lucide-react";

interface Employee {
  id: string;
  nome_completo: string;
}

interface EventoFormProps {
  evento?: {
    id: string;
    titulo: string;
    descricao: string | null;
    data_inicio: string;
    data_fim: string;
    local: string | null;
    tipo: string;
    cor: string;
    google_event_id?: string | null;
  };
  onSaved: () => void;
  onCancel: () => void;
  initialDate?: Date | null;
}

const cores = [
  { value: "#3B82F6", label: "Azul" },
  { value: "#10B981", label: "Verde" },
  { value: "#F59E0B", label: "Amarelo" },
  { value: "#EF4444", label: "Vermelho" },
  { value: "#8B5CF6", label: "Roxo" },
  { value: "#EC4899", label: "Rosa" },
  { value: "#6B7280", label: "Cinza" },
];

const tipos = [
  { value: "geral", label: "Geral" },
  { value: "reuniao", label: "Reunião" },
  { value: "treinamento", label: "Treinamento" },
  { value: "feriado", label: "Feriado" },
  { value: "evento_empresa", label: "Evento da Empresa" },
];

const EventoForm = ({ evento, onSaved, onCancel, initialDate }: EventoFormProps) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [searchEmployee, setSearchEmployee] = useState("");
  const [syncWithGoogle, setSyncWithGoogle] = useState(!!evento?.google_event_id);
  
  const { connected: googleConnected, syncToGoogle, loading: googleLoading } = useGoogleCalendar();

  const defaultDate = initialDate 
    ? format(initialDate, "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, nome_completo")
      .eq("status", "ativo")
      .order("nome_completo");
    setEmployees(data || []);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();

    const dataInicio = `${formData.get("data")}T${formData.get("hora_inicio")}:00`;
    const dataFim = `${formData.get("data")}T${formData.get("hora_fim")}:00`;

    const eventoData = {
      titulo: formData.get("titulo") as string,
      descricao: (formData.get("descricao") as string) || null,
      data_inicio: dataInicio,
      data_fim: dataFim,
      local: (formData.get("local") as string) || null,
      tipo: formData.get("tipo") as string,
      cor: formData.get("cor") as string,
      participantes: selectedParticipants.length > 0 ? selectedParticipants : null,
      criado_por: user?.id,
    };

    let error;
    let newEventoId: string | null = null;
    
    if (evento) {
      ({ error } = await supabase.from("eventos").update(eventoData).eq("id", evento.id));
      newEventoId = evento.id;
    } else {
      const { data, error: insertError } = await supabase.from("eventos").insert(eventoData).select("id").single();
      error = insertError;
      newEventoId = data?.id || null;
    }

    if (error) {
      toast.error("Erro ao salvar evento");
      console.error(error);
      setLoading(false);
      return;
    }

    // Sync with Google Calendar if enabled
    if (syncWithGoogle && googleConnected && newEventoId) {
      const googleEventId = await syncToGoogle({
        id: newEventoId,
        titulo: eventoData.titulo,
        descricao: eventoData.descricao,
        data_inicio: eventoData.data_inicio,
        data_fim: eventoData.data_fim,
        local: eventoData.local,
        google_event_id: evento?.google_event_id,
      });

      if (googleEventId && !evento?.google_event_id) {
        // Update the event with the google_event_id
        await supabase.from("eventos").update({ google_event_id: googleEventId }).eq("id", newEventoId);
      }
    }

    setLoading(false);
    toast.success(evento ? "Evento atualizado!" : "Evento criado!");
    onSaved();
  };

  const toggleParticipant = (id: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const filteredEmployees = employees.filter((emp) =>
    emp.nome_completo.toLowerCase().includes(searchEmployee.toLowerCase())
  );

  const eventoDataInicio = evento ? new Date(evento.data_inicio) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Título *</Label>
          <Input
            name="titulo"
            defaultValue={evento?.titulo}
            required
            placeholder="Nome do evento"
          />
        </div>

        <div>
          <Label>Data *</Label>
          <Input
            name="data"
            type="date"
            defaultValue={eventoDataInicio ? format(eventoDataInicio, "yyyy-MM-dd") : defaultDate}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Início *</Label>
            <Input
              name="hora_inicio"
              type="time"
              defaultValue={eventoDataInicio ? format(eventoDataInicio, "HH:mm") : "09:00"}
              required
            />
          </div>
          <div>
            <Label>Fim *</Label>
            <Input
              name="hora_fim"
              type="time"
              defaultValue={evento ? format(new Date(evento.data_fim), "HH:mm") : "10:00"}
              required
            />
          </div>
        </div>

        <div>
          <Label>Tipo</Label>
          <Select name="tipo" defaultValue={evento?.tipo || "geral"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tipos.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Cor</Label>
          <Select name="cor" defaultValue={evento?.cor || "#3B82F6"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cores.map((cor) => (
                <SelectItem key={cor.value} value={cor.value}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: cor.value }}
                    />
                    {cor.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <Label>Local</Label>
          <Input
            name="local"
            defaultValue={evento?.local || ""}
            placeholder="Localização do evento"
          />
        </div>

        <div className="col-span-2">
          <Label>Descrição</Label>
          <Textarea
            name="descricao"
            defaultValue={evento?.descricao || ""}
            placeholder="Detalhes do evento..."
            rows={3}
          />
        </div>

        <div className="col-span-2">
          <Label>Participantes</Label>
          <Input
            placeholder="Buscar funcionário..."
            value={searchEmployee}
            onChange={(e) => setSearchEmployee(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
            {filteredEmployees.map((emp) => (
              <div key={emp.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`part-${emp.id}`}
                  checked={selectedParticipants.includes(emp.id)}
                  onCheckedChange={() => toggleParticipant(emp.id)}
                />
                <label htmlFor={`part-${emp.id}`} className="text-sm cursor-pointer">
                  {emp.nome_completo}
                </label>
              </div>
            ))}
          </div>
          {selectedParticipants.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {selectedParticipants.length} participante(s) selecionado(s)
            </p>
          )}
        </div>

        {/* Google Calendar Sync Option */}
        {googleConnected && !googleLoading && (
          <div className="col-span-2 flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M19.5 22h-15A2.5 2.5 0 012 19.5v-15A2.5 2.5 0 014.5 2h15A2.5 2.5 0 0122 4.5v15a2.5 2.5 0 01-2.5 2.5z" fill="#4285F4"/>
                <path d="M12 17.5a5.5 5.5 0 110-11 5.5 5.5 0 010 11z" fill="#fff"/>
              </svg>
              <div>
                <p className="text-sm font-medium">Sincronizar com Google Calendar</p>
                {evento?.google_event_id && (
                  <p className="text-xs text-muted-foreground">Este evento está sincronizado</p>
                )}
              </div>
            </div>
            <Switch
              checked={syncWithGoogle}
              onCheckedChange={setSyncWithGoogle}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {evento ? "Atualizar" : "Criar"} Evento
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default EventoForm;
