import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ESTADOS_BRASILEIROS } from "./DadosPessoaisTab";

interface EnderecoTabProps {
  initialData?: any;
}

const EnderecoTab = ({ initialData }: EnderecoTabProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>CEP</Label>
        <Input 
          name="cep" 
          defaultValue={initialData?.cep}
          placeholder="00000-000"
        />
      </div>

      <div className="md:col-span-2">
        <Label>Endereço</Label>
        <Input 
          name="endereco" 
          defaultValue={initialData?.endereco}
          placeholder="Rua, Avenida, etc."
        />
      </div>

      <div>
        <Label>Número</Label>
        <Input 
          name="endereco_numero" 
          defaultValue={initialData?.endereco_numero}
          placeholder="Nº"
        />
      </div>

      <div>
        <Label>Complemento</Label>
        <Input 
          name="endereco_complemento" 
          defaultValue={initialData?.endereco_complemento}
          placeholder="Apto, Bloco, etc."
        />
      </div>

      <div>
        <Label>Bairro</Label>
        <Input 
          name="bairro" 
          defaultValue={initialData?.bairro}
          placeholder="Nome do bairro"
        />
      </div>

      <div>
        <Label>UF</Label>
        <Select name="uf" defaultValue={initialData?.uf || undefined}>
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
          defaultValue={initialData?.cidade}
          placeholder="Nome da cidade"
        />
      </div>
    </div>
  );
};

export default EnderecoTab;
