import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

interface CompanyFormProps {
  companyId?: string;
  initialData?: any;
  onSaved: () => void;
  onCancel: () => void;
}

export default function CompanyForm({ companyId, initialData, onSaved, onCancel }: CompanyFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState(initialData?.logo_url || null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploadingLogo(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast.success("Logo enviada com sucesso");
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast.error(error.message || "Erro ao fazer upload da logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (logoUrl) {
      try {
        const path = logoUrl.split("/company-logos/")[1];
        if (path) {
          await supabase.storage.from("company-logos").remove([path]);
        }
        setLogoUrl(null);
        toast.success("Logo removida");
      } catch (error) {
        console.error("Erro ao remover logo:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const nome = formData.get("nome") as string;
    const cnpj = formData.get("cnpj") as string;
    const endereco = formData.get("endereco") as string;
    const numeroConvenioBancario = formData.get("numero_convenio_bancario") as string;

    const companyData = {
      nome,
      cnpj: cnpj || null,
      endereco: endereco || null,
      logo_url: logoUrl,
      numero_convenio_bancario: numeroConvenioBancario || null,
    };

    let error;
    if (companyId) {
      const result = await supabase
        .from("empresas")
        .update(companyData)
        .eq("id", companyId);
      error = result.error;
    } else {
      const result = await supabase.from("empresas").insert(companyData);
      error = result.error;
    }

    if (error) {
      toast.error("Erro ao salvar empresa");
      console.error(error);
    } else {
      toast.success(companyId ? "Empresa atualizada com sucesso" : "Empresa cadastrada com sucesso");
      onSaved();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="nome">Nome da Empresa *</Label>
        <Input id="nome" name="nome" defaultValue={initialData?.nome} required />
      </div>

      <div>
        <Label htmlFor="cnpj">CNPJ</Label>
        <Input id="cnpj" name="cnpj" defaultValue={initialData?.cnpj} />
      </div>

      <div>
        <Label htmlFor="endereco">Endereço</Label>
        <Input id="endereco" name="endereco" defaultValue={initialData?.endereco} />
      </div>

      <div>
        <Label htmlFor="numero_convenio_bancario">Número do Convênio Bancário</Label>
        <Input 
          id="numero_convenio_bancario" 
          name="numero_convenio_bancario" 
          defaultValue={initialData?.numero_convenio_bancario} 
          placeholder="Ex: 12345"
        />
      </div>

      <div>
        <Label>Logo da Empresa</Label>
        <div className="mt-2 space-y-2">
          {logoUrl ? (
            <div className="flex items-center gap-4">
              <img
                src={logoUrl}
                alt="Logo da empresa"
                className="w-24 h-24 object-contain border rounded"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveLogo}
              >
                <X className="w-4 h-4 mr-2" />
                Remover
              </Button>
            </div>
          ) : (
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="hidden"
                id="logo-upload"
              />
              <Label htmlFor="logo-upload">
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingLogo}
                  asChild
                >
                  <span className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingLogo ? "Enviando..." : "Fazer Upload da Logo"}
                  </span>
                </Button>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Imagem PNG, JPG ou WEBP até 2MB
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
