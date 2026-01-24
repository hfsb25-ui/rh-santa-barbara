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
}: MovimentacoesTabProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Função *</Label>
          <Select name="cargo" defaultValue={initialData?.cargo || undefined} required>
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
          <Select name="setor" defaultValue={initialData?.setor || undefined}>
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
          <Select name="empresa_id" defaultValue={initialData?.empresa_id || undefined}>
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
          <Select name="tipo_contrato" defaultValue={initialData?.tipo_contrato || "fixo"}>
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
            defaultValue={initialData?.salario} 
          />
        </div>

        <div>
          <Label>Tipo de Salário</Label>
          <Select name="tipo_salario" defaultValue={initialData?.tipo_salario || "mensal"}>
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
          <Input name="data_admissao" type="date" defaultValue={initialData?.data_admissao} />
        </div>

        <div>
          <Label>Status</Label>
          <Select 
            name="status" 
            defaultValue={initialData?.status || "ativo"}
            onValueChange={(value) => setSelectedStatus(value)}
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
              defaultValue={initialData?.data_desligamento}
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
