import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User, FileText, MapPin, Briefcase } from "lucide-react";

import DadosPessoaisTab from "./employee-tabs/DadosPessoaisTab";
import DocumentacaoTab from "./employee-tabs/DocumentacaoTab";
import EnderecoTab from "./employee-tabs/EnderecoTab";
import MovimentacoesTab from "./employee-tabs/MovimentacoesTab";

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
  const [createChecklist, setCreateChecklist] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("dados-pessoais");

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

  const { data: empresas } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .order("nome");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: funcoes } = useQuery({
    queryKey: ["funcoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcoes")
        .select("*")
        .order("nome");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: admissionTemplates } = useQuery({
    queryKey: ["admission-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plano_checklist_templates")
        .select("id, nome")
        .eq("tipo", "admissao")
        .eq("ativo", true)
        .order("nome");
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (admissionTemplates && admissionTemplates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(admissionTemplates[0].id);
    }
  }, [admissionTemplates, selectedTemplateId]);

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

  const createAdmissionChecklist = async (newEmployeeId: string, templateId: string) => {
    try {
      const { data: templateItems, error: itemsError } = await supabase
        .from("plano_checklist_itens")
        .select("*")
        .eq("template_id", templateId)
        .order("ordem");

      if (itemsError) throw itemsError;

      const { data: { user } } = await supabase.auth.getUser();

      const { data: checklist, error: checklistError } = await supabase
        .from("plano_checklist_funcionario")
        .insert({
          employee_id: newEmployeeId,
          template_id: templateId,
          tipo: "admissao",
          created_by: user?.id,
        })
        .select()
        .single();

      if (checklistError) throw checklistError;

      const checklistItems = templateItems?.map((item) => ({
        checklist_funcionario_id: checklist.id,
        item_id: item.id,
        titulo: item.titulo,
        descricao: item.descricao,
        ordem: item.ordem,
        obrigatorio: item.obrigatorio,
        prazo_dias: item.prazo_dias,
      }));

      if (checklistItems && checklistItems.length > 0) {
        const { error: insertError } = await supabase
          .from("plano_checklist_funcionario_itens")
          .insert(checklistItems);

        if (insertError) throw insertError;
      }

      console.log("Checklist de admissão criado automaticamente");
    } catch (error: any) {
      console.error("Erro ao criar checklist de admissão:", error);
      toast.error("Erro ao criar checklist de admissão: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    console.log("=== INICIANDO CADASTRO DE FUNCIONÁRIO ===");
    const formData = new FormData(e.currentTarget);
    
    const cpf = formData.get("cpf") as string || null;
    const senha = formData.get("senha") as string || null;
    const salario = formData.get("salario") as string;
    const status = formData.get("status") as "em_admissao" | "ativo" | "ferias" | "afastado" | "demitido" || "ativo";
    
    const data = {
      nome_completo: formData.get("nome_completo") as string,
      cargo: formData.get("cargo") as string,
      setor: formData.get("setor") as string || null,
      empresa_id: formData.get("empresa_id") as string || null,
      salario: salario ? parseFloat(salario) : null,
      tipo_salario: formData.get("tipo_salario") as "mensal" | "diario" | "por_hora" || "mensal",
      tipo_contrato: formData.get("tipo_contrato") as "fixo" | "intermitente" | "prestador_servico" || "fixo",
      cpf: cpf,
      rg: formData.get("rg") as string || null,
      telefone: formData.get("telefone") as string || null,
      endereco: formData.get("endereco") as string || null,
      data_nascimento: formData.get("data_nascimento") as string || null,
      data_admissao: formData.get("data_admissao") as string || null,
      status: status,
      data_desligamento: status === "demitido" ? (formData.get("data_desligamento") as string || null) : null,
      sexo: formData.get("sexo") as string || null,
      // Novos campos - Dados Pessoais
      nacionalidade: formData.get("nacionalidade") as string || null,
      naturalidade_estado: formData.get("naturalidade_estado") as string || null,
      naturalidade_municipio: formData.get("naturalidade_municipio") as string || null,
      nome_pai: formData.get("nome_pai") as string || null,
      nome_mae: formData.get("nome_mae") as string || null,
      raca_cor: formData.get("raca_cor") as string || null,
      // Novos campos - Documentação
      carteira_trabalho: formData.get("carteira_trabalho") as string || null,
      pis: formData.get("pis") as string || null,
      rg_orgao_expedidor: formData.get("rg_orgao_expedidor") as string || null,
      rg_data_emissao: formData.get("rg_data_emissao") as string || null,
      rg_uf: formData.get("rg_uf") as string || null,
      // Novos campos - Endereço
      cep: formData.get("cep") as string || null,
      endereco_numero: formData.get("endereco_numero") as string || null,
      endereco_complemento: formData.get("endereco_complemento") as string || null,
      bairro: formData.get("bairro") as string || null,
      uf: formData.get("uf") as string || null,
      cidade: formData.get("cidade") as string || null,
    };

    try {
      if (employeeId) {
        let fotoUrl = initialData?.foto_url;
        if (photoFile) {
          const uploadedUrl = await uploadPhoto(employeeId);
          if (uploadedUrl) fotoUrl = uploadedUrl;
        }

        const { error } = await supabase
          .from("employees")
          .update({ ...data, foto_url: fotoUrl })
          .eq("id", employeeId);

        if (error) throw error;
        toast.success("Funcionário atualizado!");
      } else {
        if (!cpf) {
          toast.error("CPF é obrigatório para criar novo funcionário");
          setActiveTab("documentacao");
          setLoading(false);
          return;
        }
        
        if (!senha) {
          toast.error("Senha é obrigatória para criar novo funcionário");
          setActiveTab("dados-pessoais");
          setLoading(false);
          return;
        }

        console.log("Criando usuário via edge function");
        
        const { data: functionData, error: functionError } = await supabase.functions.invoke('create-employee-user', {
          body: {
            cpf: cpf,
            senha: senha,
            nome_completo: data.nome_completo
          }
        });

        if (functionError) {
          console.error("Erro na função:", functionError);
          toast.error("Erro ao criar login: " + functionError.message);
          setLoading(false);
          return;
        }

        if (functionData.error) {
          console.error("Erro retornado pela função:", functionData.error);
          toast.error("Erro ao criar login: " + functionData.error);
          setLoading(false);
          return;
        }

        const userId = functionData.user.id;
        console.log("Usuário criado com sucesso:", userId);

        const { data: newEmployee, error: employeeError } = await supabase
          .from("employees")
          .insert([{ ...data, user_id: userId }])
          .select()
          .single();

        if (employeeError) {
          console.error("Erro ao inserir funcionário:", employeeError);
          toast.error("Erro ao salvar funcionário: " + employeeError.message);
          setLoading(false);
          return;
        }

        console.log("Funcionário criado:", newEmployee.id);

        if (photoFile && newEmployee) {
          const uploadedUrl = await uploadPhoto(newEmployee.id);
          if (uploadedUrl) {
            await supabase
              .from("employees")
              .update({ foto_url: uploadedUrl })
              .eq("id", newEmployee.id);
          }
        }

        if (data.status === "em_admissao" && createChecklist && selectedTemplateId) {
          await createAdmissionChecklist(newEmployee.id, selectedTemplateId);
        }

        const successMessage = data.status === "em_admissao" && createChecklist
          ? "Funcionário cadastrado com processo de admissão iniciado! Login: CPF " + cpf
          : "Funcionário cadastrado! Login: CPF " + cpf;
        toast.success(successMessage);
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
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dados-pessoais" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Dados Pessoais</span>
              </TabsTrigger>
              <TabsTrigger value="documentacao" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Documentação</span>
              </TabsTrigger>
              <TabsTrigger value="endereco" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Endereço</span>
              </TabsTrigger>
              <TabsTrigger value="movimentacoes" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <span className="hidden sm:inline">Movimentações</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados-pessoais" className="mt-6">
              <DadosPessoaisTab
                initialData={initialData}
                isEditing={!!employeeId}
                photoPreview={photoPreview}
                onPhotoChange={handlePhotoChange}
                onRemovePhoto={handleRemovePhoto}
              />
            </TabsContent>

            <TabsContent value="documentacao" className="mt-6">
              <DocumentacaoTab
                initialData={initialData}
                isEditing={!!employeeId}
              />
            </TabsContent>

            <TabsContent value="endereco" className="mt-6">
              <EnderecoTab initialData={initialData} />
            </TabsContent>

            <TabsContent value="movimentacoes" className="mt-6">
              <MovimentacoesTab
                initialData={initialData}
                isEditing={!!employeeId}
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
                createChecklist={createChecklist}
                setCreateChecklist={setCreateChecklist}
                selectedTemplateId={selectedTemplateId}
                setSelectedTemplateId={setSelectedTemplateId}
                setores={setores}
                empresas={empresas}
                funcoes={funcoes}
                admissionTemplates={admissionTemplates}
              />
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4 border-t">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmployeeForm;
