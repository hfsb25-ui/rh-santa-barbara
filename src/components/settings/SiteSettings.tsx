import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { Moon, Sun, Upload } from "lucide-react";
import { toast } from "sonner";

export function SiteSettings() {
  const { theme, setTheme } = useTheme();
  const [siteTitle, setSiteTitle] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  useEffect(() => {
    // Get current title
    const currentTitle = document.title;
    setSiteTitle(currentTitle);

    // Get current description
    const metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    if (metaDesc) {
      setSiteDescription(metaDesc.content);
    }

    // Get current favicon
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      setFaviconPreview(link.href);
    }
  }, []);

  const handleTitleChange = () => {
    if (!siteTitle.trim()) {
      toast.error("O título não pode estar vazio");
      return;
    }
    
    document.title = siteTitle;
    localStorage.setItem("siteTitle", siteTitle);
    toast.success("Título atualizado com sucesso!");
  };

  const handleDescriptionChange = () => {
    if (!siteDescription.trim()) {
      toast.error("A descrição não pode estar vazia");
      return;
    }
    
    // Update meta tags
    const metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    const ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement;
    
    if (metaDesc) metaDesc.content = siteDescription;
    if (ogDesc) ogDesc.content = siteDescription;
    
    localStorage.setItem("siteDescription", siteDescription);
    toast.success("Descrição atualizada com sucesso!");
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor, selecione um arquivo de imagem");
        return;
      }

      setFaviconFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setFaviconPreview(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconUpdate = () => {
    if (!faviconPreview) {
      toast.error("Por favor, selecione um favicon");
      return;
    }

    // Update favicon in DOM
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = faviconPreview;
    
    // Save to localStorage
    localStorage.setItem("siteFavicon", faviconPreview);
    
    toast.success("Favicon atualizado com sucesso!");
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações do Site</h2>
        <p className="text-muted-foreground">
          Personalize a aparência e informações do seu sistema
        </p>
      </div>

      {/* Site Title */}
      <Card>
        <CardHeader>
          <CardTitle>Título do Site</CardTitle>
          <CardDescription>
            Altere o título que aparece na aba do navegador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="site-title">Título</Label>
            <Input
              id="site-title"
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              placeholder="Digite o título do site"
            />
          </div>
          <Button onClick={handleTitleChange}>
            Salvar Título
          </Button>
        </CardContent>
      </Card>

      {/* Site Description */}
      <Card>
        <CardHeader>
          <CardTitle>Descrição do Site</CardTitle>
          <CardDescription>
            Altere a descrição que aparece nos resultados de busca e redes sociais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="site-description">Descrição</Label>
            <Input
              id="site-description"
              value={siteDescription}
              onChange={(e) => setSiteDescription(e.target.value)}
              placeholder="Digite a descrição do site"
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground">
              {siteDescription.length}/160 caracteres (recomendado para SEO)
            </p>
          </div>
          <Button onClick={handleDescriptionChange}>
            Salvar Descrição
          </Button>
        </CardContent>
      </Card>

      {/* Favicon */}
      <Card>
        <CardHeader>
          <CardTitle>Favicon</CardTitle>
          <CardDescription>
            Altere o ícone que aparece na aba do navegador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="favicon">Arquivo do Favicon</Label>
            <div className="flex items-center gap-4">
              <Input
                id="favicon"
                type="file"
                accept="image/*"
                onChange={handleFaviconChange}
                className="flex-1"
              />
              <Button size="icon" variant="outline" asChild>
                <label htmlFor="favicon" className="cursor-pointer">
                  <Upload className="h-4 w-4" />
                </label>
              </Button>
            </div>
            {faviconPreview && (
              <div className="flex items-center gap-2">
                <img 
                  src={faviconPreview} 
                  alt="Favicon preview" 
                  className="w-8 h-8 rounded border"
                />
                <span className="text-sm text-muted-foreground">
                  Pré-visualização do favicon
                </span>
              </div>
            )}
          </div>
          <Button onClick={handleFaviconUpdate}>
            Atualizar Favicon
          </Button>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle>Tema</CardTitle>
          <CardDescription>
            Escolha entre tema claro ou escuro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === "dark" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <div>
                <Label htmlFor="theme-switch" className="text-base">
                  Modo Escuro
                </Label>
                <p className="text-sm text-muted-foreground">
                  {theme === "dark" ? "Ativado" : "Desativado"}
                </p>
              </div>
            </div>
            <Switch
              id="theme-switch"
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
