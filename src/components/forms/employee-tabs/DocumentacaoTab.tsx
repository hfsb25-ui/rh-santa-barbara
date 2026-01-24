import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ESTADOS_BRASILEIROS } from "./DadosPessoaisTab";

interface DocumentacaoTabProps {
  initialData?: any;
  isEditing: boolean;
}

const DocumentacaoTab = ({ initialData, isEditing }: DocumentacaoTabProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>Carteira de Trabalho</Label>
        <Input 
          name="carteira_trabalho" 
          defaultValue={initialData?.carteira_trabalho}
          placeholder="Número da CTPS"
        />
      </div>

      <div>
        <Label>CPF {!isEditing && "*"}</Label>
        <Input 
          name="cpf" 
          defaultValue={initialData?.cpf} 
          required={!isEditing}
          placeholder="000.000.000-00"
        />
      </div>

      <div>
        <Label>PIS</Label>
        <Input 
          name="pis" 
          defaultValue={initialData?.pis}
          placeholder="Número do PIS"
        />
      </div>

      <div>
        <Label>RG</Label>
        <Input 
          name="rg" 
          defaultValue={initialData?.rg}
          placeholder="Número do RG"
        />
      </div>

      <div>
        <Label>RG - Órgão Expedidor</Label>
        <Input 
          name="rg_orgao_expedidor" 
          defaultValue={initialData?.rg_orgao_expedidor}
          placeholder="Ex: SSP"
        />
      </div>

      <div>
        <Label>RG - Data de Emissão</Label>
        <Input 
          name="rg_data_emissao" 
          type="date" 
          defaultValue={initialData?.rg_data_emissao}
        />
      </div>

      <div>
        <Label>RG - UF de Emissão</Label>
        <Select name="rg_uf" defaultValue={initialData?.rg_uf || undefined}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o estado" />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS_BRASILEIROS.map((estado) => (
              <SelectItem key={estado.sigla} value={estado.sigla}>
                {estado.sigla} - {estado.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Telefone</Label>
        <Input 
          name="telefone" 
          defaultValue={initialData?.telefone}
          placeholder="(00) 00000-0000"
        />
      </div>
    </div>
  );
};

export default DocumentacaoTab;
