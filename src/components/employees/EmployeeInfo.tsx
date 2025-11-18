import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface EmployeeInfoProps {
  employee: any;
  onUpdate: () => void;
}

const EmployeeInfo = ({ employee }: EmployeeInfoProps) => {
  const getStatusBadge = (status: string) => {
    const variants: any = {
      ativo: "default",
      ferias: "secondary",
      afastado: "destructive",
      demitido: "outline",
    };
    const labels: any = {
      ativo: "Ativo",
      ferias: "Férias",
      afastado: "Afastado",
      demitido: "Demitido",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Informações do Funcionário</span>
          {getStatusBadge(employee.status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <Avatar className="w-32 h-32">
            <AvatarImage src={employee.foto_url || undefined} alt={employee.nome_completo} />
            <AvatarFallback className="bg-muted">
              <User className="w-16 h-16 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Nome Completo</p>
          <p className="font-medium">{employee.nome_completo}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Cargo</p>
          <p className="font-medium">{employee.cargo}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Setor</p>
          <p className="font-medium">{employee.setor || "—"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Data de Admissão</p>
          <p className="font-medium">
            {employee.data_admissao
              ? new Date(employee.data_admissao).toLocaleDateString("pt-BR")
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">CPF</p>
          <p className="font-medium">{employee.cpf || "—"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Telefone</p>
          <p className="font-medium">{employee.telefone || "—"}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-sm text-muted-foreground">Endereço</p>
          <p className="font-medium">{employee.endereco || "—"}</p>
        </div>
      </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeInfo;
