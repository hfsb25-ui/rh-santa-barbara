import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardCheck } from "lucide-react";

interface MovimentacoesTabProps {
  initialData?: any;
  isEditing: boolean;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  createChecklist: boolean;
  setCreateChecklist: (value: boolean) => void;
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  setores: any[] | undefined;
  empresas: any[] | undefined;
  funcoes: any[] | undefined;
  admissionTemplates: any[] | undefined;
  formValues: Record<string, string>;
  onFormChange: (field: string, value: string) => void;
}

const MovimentacoesTab = ({
  initialData,
  isEditing,
  selectedStatus,
  setSelectedStatus,
  createChecklist,
  setCreateChecklist,
  selectedTemplateId,
  setSelectedTemplateId,
  setores,
  empresas,
  funcoes,
  admissionTemplates,
  formValues,
  onFormChange,
}: MovimentacoesTabProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Função *</Label>
          <Select 
            value={formValues.cargo || ""} 
            onValueChange={(value) => onFormChange("cargo", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a função" />
            </SelectTrigger>
            <SelectContent>
              {funcoes?.map((funcao) => (
                <SelectItem key={funcao.id} value={funcao.nome}>
                  {funcao.nome} {funcao.cbo ? `(CBO: ${funcao.cbo})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Setor</Label>
          <Select 
            value={formValues.setor || ""} 
            onValueChange={(value) => onFormChange("setor", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o setor" />
            </SelectTrigger>
            <SelectContent>
              {setores?.map((setor) => (
                <SelectItem key={setor.id} value={setor.nome}>
                  {setor.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Empresa</Label>
          <Select 
            value={formValues.empresa_id || ""} 
            onValueChange={(value) => onFormChange("empresa_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              {empresas?.map((empresa) => (
                <SelectItem key={empresa.id} value={empresa.id}>
                  {empresa.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Tipo de Contrato</Label>
          <Select 
            value={formValues.tipo_contrato || "fixo"} 
            onValueChange={(value) => onFormChange("tipo_contrato", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixo">Fixo</SelectItem>
              <SelectItem value="intermitente">Intermitente</SelectItem>
              <SelectItem value="prestador_servico">Prestador de Serviço</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Salário</Label>
          <Input 
            name="salario" 
            type="number" 
            step="0.01" 
            min="0"
            placeholder="0.00"
            value={formValues.salario || ""}
            onChange={(e) => onFormChange("salario", e.target.value)}
          />
        </div>

        <div>
          <Label>Tipo de Salário</Label>
          <Select 
            value={formValues.tipo_salario || "mensal"} 
            onValueChange={(value) => onFormChange("tipo_salario", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mensal">Mensal</SelectItem>
              <SelectItem value="diario">Diário</SelectItem>
              <SelectItem value="por_hora">Por Hora</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Data de Admissão</Label>
          <Input 
            name="data_admissao" 
            type="date" 
            value={formValues.data_admissao || ""}
            onChange={(e) => onFormChange("data_admissao", e.target.value)}
          />
        </div>

        <div>
          <Label>Status</Label>
          <Select 
            value={formValues.status || "ativo"}
            onValueChange={(value) => {
              onFormChange("status", value);
              setSelectedStatus(value);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="em_admissao">Em Admissão</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="ferias">Férias</SelectItem>
              <SelectItem value="afastado">Afastado</SelectItem>
              <SelectItem value="demitido">Demitido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedStatus === "demitido" && (
          <div>
            <Label>Data de Desligamento</Label>
            <Input 
              name="data_desligamento" 
              type="date" 
              value={formValues.data_desligamento || ""}
              onChange={(e) => onFormChange("data_desligamento", e.target.value)}
            />
          </div>
        )}
      </div>

      {selectedStatus === "em_admissao" && !isEditing && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-amber-800 dark:text-amber-200">Processo de Admissão</span>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="create-checklist"
              checked={createChecklist}
              onCheckedChange={(checked) => setCreateChecklist(!!checked)}
            />
            <Label htmlFor="create-checklist" className="text-sm cursor-pointer">
              Criar checklist de admissão automaticamente
            </Label>
          </div>
          {createChecklist && admissionTemplates && admissionTemplates.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Template do Checklist</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {admissionTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {createChecklist && (!admissionTemplates || admissionTemplates.length === 0) && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Nenhum template de admissão configurado. Configure um template em Plano de Admissão/Desligamento.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MovimentacoesTab;
