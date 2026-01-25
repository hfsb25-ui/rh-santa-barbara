import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ESTADOS_BRASILEIROS } from "./DadosPessoaisTab";

interface DocumentacaoTabProps {
  initialData?: any;
  isEditing: boolean;
  formValues: Record<string, string>;
  onFormChange: (field: string, value: string) => void;
}

const DocumentacaoTab = ({ initialData, isEditing, formValues, onFormChange }: DocumentacaoTabProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>Carteira de Trabalho</Label>
        <Input 
          name="carteira_trabalho" 
          value={formValues.carteira_trabalho || ""}
          onChange={(e) => onFormChange("carteira_trabalho", e.target.value)}
          placeholder="Número da CTPS"
        />
      </div>

      <div>
        <Label>CPF {!isEditing && "*"}</Label>
        <Input 
          name="cpf" 
          value={formValues.cpf || ""}
          onChange={(e) => onFormChange("cpf", e.target.value)}
          required={!isEditing}
          placeholder="000.000.000-00"
        />
      </div>

      <div>
        <Label>PIS</Label>
        <Input 
          name="pis" 
          value={formValues.pis || ""}
          onChange={(e) => onFormChange("pis", e.target.value)}
          placeholder="Número do PIS"
        />
      </div>

      <div>
        <Label>RG</Label>
        <Input 
          name="rg" 
          value={formValues.rg || ""}
          onChange={(e) => onFormChange("rg", e.target.value)}
          placeholder="Número do RG"
        />
      </div>

      <div>
        <Label>RG - Órgão Expedidor</Label>
        <Input 
          name="rg_orgao_expedidor" 
          value={formValues.rg_orgao_expedidor || ""}
          onChange={(e) => onFormChange("rg_orgao_expedidor", e.target.value)}
          placeholder="Ex: SSP"
        />
      </div>

      <div>
        <Label>RG - Data de Emissão</Label>
        <Input 
          name="rg_data_emissao" 
          type="date" 
          value={formValues.rg_data_emissao || ""}
          onChange={(e) => onFormChange("rg_data_emissao", e.target.value)}
        />
      </div>

      <div>
        <Label>RG - UF de Emissão</Label>
        <Select 
          value={formValues.rg_uf || ""} 
          onValueChange={(value) => onFormChange("rg_uf", value)}
        >
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
          value={formValues.telefone || ""}
          onChange={(e) => onFormChange("telefone", e.target.value)}
          placeholder="(00) 00000-0000"
        />
      </div>
    </div>
  );
};

export default DocumentacaoTab;
