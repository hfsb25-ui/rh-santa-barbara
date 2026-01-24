import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";

const ESTADOS_BRASILEIROS = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
];

const RACAS_CORES = [
  "Branca",
  "Preta",
  "Parda",
  "Amarela",
  "Indígena",
  "Não informado",
];

interface DadosPessoaisTabProps {
  initialData?: any;
  isEditing: boolean;
  photoPreview: string | null;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
}

const DadosPessoaisTab = ({ 
  initialData, 
  isEditing, 
  photoPreview, 
  onPhotoChange, 
  onRemovePhoto 
}: DadosPessoaisTabProps) => {
  return (
    <div className="space-y-6">
      {/* Foto */}
      <div className="flex flex-col items-center gap-4">
        <Avatar className="w-24 h-24">
          <AvatarImage src={photoPreview || undefined} />
          <AvatarFallback>
            <Upload className="w-8 h-8 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <div className="flex gap-2">
          <Label htmlFor="photo-upload" className="cursor-pointer">
            <Button type="button" variant="outline" size="sm" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {photoPreview ? "Trocar Foto" : "Upload Foto"}
              </span>
            </Button>
          </Label>
          <Input
            id="photo-upload"
            type="file"
            accept="image/*"
            onChange={onPhotoChange}
            className="hidden"
          />
          {photoPreview && (
            <Button type="button" variant="ghost" size="sm" onClick={onRemovePhoto}>
              <X className="w-4 h-4 mr-2" />
              Remover
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Nome Completo *</Label>
          <Input name="nome_completo" defaultValue={initialData?.nome_completo} required />
        </div>

        <div>
          <Label>Data de Nascimento</Label>
          <Input 
            name="data_nascimento" 
            type="date" 
            defaultValue={initialData?.data_nascimento}
          />
        </div>

        <div>
          <Label>Nacionalidade</Label>
          <Select name="nacionalidade" defaultValue={initialData?.nacionalidade || undefined}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Brasileiro(a)">Brasileiro(a)</SelectItem>
              <SelectItem value="Estrangeiro(a)">Estrangeiro(a)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Naturalidade - Estado</Label>
          <Select name="naturalidade_estado" defaultValue={initialData?.naturalidade_estado || undefined}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o estado" />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_BRASILEIROS.map((estado) => (
                <SelectItem key={estado.sigla} value={estado.sigla}>
                  {estado.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Naturalidade - Município</Label>
          <Input 
            name="naturalidade_municipio" 
            defaultValue={initialData?.naturalidade_municipio}
            placeholder="Digite o município"
          />
        </div>

        <div>
          <Label>Nome do Pai</Label>
          <Input 
            name="nome_pai" 
            defaultValue={initialData?.nome_pai}
            placeholder="Nome completo do pai"
          />
        </div>

        <div>
          <Label>Nome da Mãe</Label>
          <Input 
            name="nome_mae" 
            defaultValue={initialData?.nome_mae}
            placeholder="Nome completo da mãe"
          />
        </div>

        <div>
          <Label>Raça/Cor</Label>
          <Select name="raca_cor" defaultValue={initialData?.raca_cor || undefined}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {RACAS_CORES.map((raca) => (
                <SelectItem key={raca} value={raca}>
                  {raca}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Sexo</Label>
          <Select name="sexo" defaultValue={initialData?.sexo || undefined}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o sexo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Masculino">Masculino</SelectItem>
              <SelectItem value="Feminino">Feminino</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
              <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isEditing && (
          <div>
            <Label>Senha *</Label>
            <Input 
              name="senha" 
              type="password"
              placeholder="Defina a senha do funcionário"
              required
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DadosPessoaisTab;
export { ESTADOS_BRASILEIROS };
