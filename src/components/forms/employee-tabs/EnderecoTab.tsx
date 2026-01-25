import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ESTADOS_BRASILEIROS } from "./DadosPessoaisTab";

interface EnderecoTabProps {
  initialData?: any;
  formValues: Record<string, string>;
  onFormChange: (field: string, value: string) => void;
}

const EnderecoTab = ({ initialData, formValues, onFormChange }: EnderecoTabProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>CEP</Label>
        <Input 
          name="cep" 
          value={formValues.cep || ""}
          onChange={(e) => onFormChange("cep", e.target.value)}
          placeholder="00000-000"
        />
      </div>

      <div className="md:col-span-2">
        <Label>Endereço</Label>
        <Input 
          name="endereco" 
          value={formValues.endereco || ""}
          onChange={(e) => onFormChange("endereco", e.target.value)}
          placeholder="Rua, Avenida, etc."
        />
      </div>

      <div>
        <Label>Número</Label>
        <Input 
          name="endereco_numero" 
          value={formValues.endereco_numero || ""}
          onChange={(e) => onFormChange("endereco_numero", e.target.value)}
          placeholder="Nº"
        />
      </div>

      <div>
        <Label>Complemento</Label>
        <Input 
          name="endereco_complemento" 
          value={formValues.endereco_complemento || ""}
          onChange={(e) => onFormChange("endereco_complemento", e.target.value)}
          placeholder="Apto, Bloco, etc."
        />
      </div>

      <div>
        <Label>Bairro</Label>
        <Input 
          name="bairro" 
          value={formValues.bairro || ""}
          onChange={(e) => onFormChange("bairro", e.target.value)}
          placeholder="Nome do bairro"
        />
      </div>

      <div>
        <Label>UF</Label>
        <Select 
          value={formValues.uf || ""} 
          onValueChange={(value) => onFormChange("uf", value)}
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
        <Label>Cidade</Label>
        <Input 
          name="cidade" 
          value={formValues.cidade || ""}
          onChange={(e) => onFormChange("cidade", e.target.value)}
          placeholder="Nome da cidade"
        />
      </div>
    </div>
  );
};

export default EnderecoTab;
