import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

interface EmployeeFormProps {
  employeeId?: string;
  initialData?: any;
  onSaved: () => void;
  onCancel: () => void;
}

const EmployeeForm = ({ employeeId, initialData, onSaved, onCancel }: EmployeeFormProps) => {
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.foto_url || null);
  const [selectedStatus, setSelectedStatus] = useState<string>(initialData?.status || "ativo");

  const { data: setores } = useQuery({
    queryKey: ["setores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setores")
        .select("*")
        .order("nome");
      
      if (error) throw error;
      return data;
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A foto deve ter no máximo 5MB");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const uploadPhoto = async (employeeIdForUpload: string): Promise<string | null> => {
    if (!photoFile) return null;

    try {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${employeeIdForUpload}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-photos')
        .upload(filePath, photoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload da foto:", error);
      toast.error("Erro ao fazer upload da foto");
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const cpf = formData.get("cpf") as string || null;
    const senha = formData.get("senha") as string || null;
    const salario = formData.get("salario") as string;
    const status = formData.get("status") as "ativo" | "ferias" | "afastado" | "demitido" || "ativo";
    const data = {
      nome_completo: formData.get("nome_completo") as string,
      cargo: formData.get("cargo") as string,
      setor: formData.get("setor") as string || null,
      salario: salario ? parseFloat(salario) : null,
      cpf: cpf,
      telefone: formData.get("telefone") as string || null,
      endereco: formData.get("endereco") as string || null,
      data_admissao: formData.get("data_admissao") as string || null,
      status: status,
      data_desligamento: status === "demitido" ? (formData.get("data_desligamento") as string || null) : null,
    };

    try {
      if (employeeId) {
        // Upload da foto se houver
        let fotoUrl = initialData?.foto_url;
        if (photoFile) {
          const uploadedUrl = await uploadPhoto(employeeId);
          if (uploadedUrl) fotoUrl = uploadedUrl;
        }

        // Apenas atualizar funcionário existente
        const { error } = await supabase
          .from("employees")
          .update({ ...data, foto_url: fotoUrl })
          .eq("id", employeeId);

        if (error) throw error;
        toast.success("Funcionário atualizado!");
      } else {
        // Criar novo funcionário
        if (!cpf) {
          toast.error("CPF é obrigatório para criar novo funcionário");
          setLoading(false);
          return;
        }
        
        if (!senha) {
          toast.error("Senha é obrigatória para criar novo funcionário");
          setLoading(false);
          return;
        }

        // Criar usuário no auth com CPF como email
        const email = `${cpf}@empresa.local`;
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email,
          password: senha,
          options: {
            data: {
              nome_completo: data.nome_completo,
              role: 'funcionario'
            },
          },
        });

        if (authError) {
          toast.error("Erro ao criar login do funcionário: " + authError.message);
          setLoading(false);
          return;
        }

        if (!authData.user) {
          toast.error("Erro ao criar usuário");
          setLoading(false);
          return;
        }

        // Criar funcionário vinculado ao user_id
        const { data: newEmployee, error: employeeError } = await supabase
          .from("employees")
          .insert([{ ...data, user_id: authData.user.id }])
          .select()
          .single();

        if (employeeError) {
          toast.error("Erro ao salvar funcionário");
          setLoading(false);
          return;
        }

        // Upload da foto se houver
        if (photoFile && newEmployee) {
          const uploadedUrl = await uploadPhoto(newEmployee.id);
          if (uploadedUrl) {
            await supabase
              .from("employees")
              .update({ foto_url: uploadedUrl })
              .eq("id", newEmployee.id);
          }
        }

        // Criar role de funcionário
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert([{ user_id: authData.user.id, role: "funcionario" }]);

        if (roleError) {
          console.error("Erro ao criar role:", roleError);
          // Não bloquear o cadastro por erro de role
        }

        toast.success("Funcionário cadastrado! Login: CPF " + cpf);
      }
      
      onSaved();
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao salvar funcionário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{employeeId ? "Editar Funcionário" : "Novo Funcionário"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-4 mb-6">
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
                onChange={handlePhotoChange}
                className="hidden"
              />
              {photoPreview && (
                <Button type="button" variant="ghost" size="sm" onClick={handleRemovePhoto}>
                  <X className="w-4 h-4 mr-2" />
                  Remover
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome Completo</Label>
              <Input name="nome_completo" defaultValue={initialData?.nome_completo} required />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input name="cargo" defaultValue={initialData?.cargo} required />
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
              <Label>CPF</Label>
              <Input 
                name="cpf" 
                defaultValue={initialData?.cpf} 
                required={!employeeId}
                disabled={!!employeeId}
              />
            </div>
            {!employeeId && (
              <div>
                <Label>Senha</Label>
                <Input 
                  name="senha" 
                  type="password"
                  placeholder="Defina a senha do funcionário"
                  required
                />
              </div>
            )}
            <div>
              <Label>Telefone</Label>
              <Input name="telefone" defaultValue={initialData?.telefone} />
            </div>
            <div className="col-span-2">
              <Label>Endereço</Label>
              <Input name="endereco" defaultValue={initialData?.endereco} />
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
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>Salvar</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmployeeForm;
