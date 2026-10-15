import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Upload, Database, AlertTriangle, CheckCircle, XCircle, FileCode2, Blocks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import JSZip from "jszip";

interface ImportResult {
  success: boolean;
  results: Record<string, { inserted: number; errors: string[] }>;
}

interface StorageExportManifest {
  files: Array<{ bucket: string; path: string; signedUrl: string }>;
  emptyBuckets: string[];
}

export function DatabaseBackupSettings() {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingSql, setIsExportingSql] = useState(false);
  const [isExportingSchema, setIsExportingSchema] = useState(false);
  const [isExportingBuckets, setIsExportingBuckets] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado para exportar");
        return;
      }

      setProgress(30);

      const response = await supabase.functions.invoke("export-database", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      setProgress(80);

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      // Criar e baixar o arquivo
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-rh-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      toast.success("Backup exportado com sucesso!");

    } catch (error: any) {
      console.error("Erro ao exportar:", error);
      toast.error(`Erro ao exportar: ${error.message}`);
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const handleExportSql = async () => {
    setIsExportingSql(true);
    setProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado para exportar");
        return;
      }

      setProgress(30);
      const { data, error } = await supabase.functions.invoke("export-database-sql", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      const sqlContent = data instanceof Blob ? await data.text() : data;
      if (typeof sqlContent !== "string" || !sqlContent.includes("BEGIN;")) {
        throw new Error("O arquivo SQL não foi gerado corretamente");
      }

      setProgress(90);
      const blob = new Blob([sqlContent], { type: "application/sql;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-rh-${format(new Date(), "yyyy-MM-dd-HHmm")}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      toast.success("Arquivo SQL exportado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao exportar SQL:", error);
      toast.error(`Erro ao exportar SQL: ${error.message}`);
    } finally {
      setIsExportingSql(false);
      setProgress(0);
    }
  };

  const handleExportSchema = async () => {
    setIsExportingSchema(true);
    setProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado para exportar");
        return;
      }

      setProgress(30);
      const { data, error } = await supabase.functions.invoke("export-database-schema", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      const sqlContent = data instanceof Blob ? await data.text() : data;
      if (typeof sqlContent !== "string" || !sqlContent.includes("-- Fim da estrutura do banco de dados")) {
        throw new Error("O arquivo da estrutura SQL não foi gerado corretamente");
      }

      setProgress(90);
      const blob = new Blob([sqlContent], { type: "application/sql;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estrutura-rh-${format(new Date(), "yyyy-MM-dd-HHmm")}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      toast.success("Estrutura SQL exportada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao exportar estrutura SQL:", error);
      toast.error(`Erro ao exportar estrutura SQL: ${error.message}`);
    } finally {
      setIsExportingSchema(false);
      setProgress(0);
    }
  };

  const handleExportBuckets = async () => {
    setIsExportingBuckets(true);
    setProgress(5);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado para exportar");
        return;
      }

      const { data, error } = await supabase.functions.invoke("export-storage-buckets", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;

      const manifest = data as StorageExportManifest;
      if (!Array.isArray(manifest?.files) || !Array.isArray(manifest?.emptyBuckets)) {
        throw new Error("A lista de arquivos não foi gerada corretamente");
      }

      const zip = new JSZip();
      for (const bucket of manifest.emptyBuckets) zip.folder(bucket);

      for (let index = 0; index < manifest.files.length; index += 1) {
        const file = manifest.files[index];
        const response = await fetch(file.signedUrl);
        if (!response.ok) throw new Error(`Falha ao baixar ${file.bucket}/${file.path}`);
        zip.file(`${file.bucket}/${file.path}`, await response.blob());
        setProgress(10 + Math.round(((index + 1) / Math.max(manifest.files.length, 1)) * 75));
      }

      setProgress(90);
      const blob = await zip.generateAsync(
        { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
        (metadata) => setProgress(90 + Math.round(metadata.percent / 10)),
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `arquivos-buckets-${format(new Date(), "yyyy-MM-dd-HHmm")}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setProgress(100);
      toast.success(`${manifest.files.length} arquivo(s) exportado(s) em um ZIP`);
    } catch (error: any) {
      console.error("Erro ao exportar buckets:", error);
      toast.error(`Erro ao exportar arquivos: ${error.message}`);
    } finally {
      setIsExportingBuckets(false);
      setProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".json")) {
        toast.error("Por favor, selecione um arquivo .json");
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImportClick = () => {
    if (!selectedFile) {
      toast.error("Selecione um arquivo para importar");
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleImport = async () => {
    setShowConfirmDialog(false);
    if (!selectedFile) return;

    setIsImporting(true);
    setProgress(10);
    setImportResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado para importar");
        return;
      }

      setProgress(20);

      // Ler o arquivo
      const fileContent = await selectedFile.text();
      const jsonData = JSON.parse(fileContent);

      if (!jsonData.tables) {
        throw new Error("Arquivo de backup inválido. Não contém 'tables'.");
      }

      setProgress(40);

      const response = await supabase.functions.invoke("import-database", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          tables: jsonData.tables,
          mode: importMode,
        },
      });

      setProgress(90);

      if (response.error) {
        throw new Error(response.error.message);
      }

      setImportResult(response.data);
      setProgress(100);
      toast.success("Importação concluída!");

    } catch (error: any) {
      console.error("Erro ao importar:", error);
      toast.error(`Erro ao importar: ${error.message}`);
    } finally {
      setIsImporting(false);
      setProgress(0);
    }
  };

  const getTotalImported = () => {
    if (!importResult?.results) return 0;
    return Object.values(importResult.results).reduce((acc, r) => acc + r.inserted, 0);
  };

  const getTotalErrors = () => {
    if (!importResult?.results) return 0;
    return Object.values(importResult.results).reduce((acc, r) => acc + r.errors.length, 0);
  };

  return (
    <div className="space-y-6">
      {/* Exportar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Exportar Banco de Dados
          </CardTitle>
          <CardDescription>
            Exporte todos os dados do sistema em um arquivo JSON para backup ou migração.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            O arquivo exportado incluirá:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Empresas, setores e funções</li>
              <li>Funcionários e seus dados</li>
              <li>Férias, folgas, faltas e afastamentos</li>
              <li>EPIs e uniformes</li>
              <li>Treinamentos e avaliações</li>
              <li>E todos os demais registros do sistema</li>
            </ul>
          </div>

          {(isExporting || isExportingSql || isExportingSchema || isExportingBuckets) && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                {isExportingBuckets ? "Exportando arquivos" : isExportingSchema ? "Preparando estrutura SQL" : isExportingSql ? "Preparando arquivo SQL" : "Exportando dados"}... {progress}%
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Button
              onClick={handleExport}
              disabled={isExporting || isExportingSql || isExportingSchema || isExportingBuckets}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? "Exportando..." : "Exportar Backup JSON"}
            </Button>
            <Button
              onClick={handleExportSql}
              disabled={isExporting || isExportingSql || isExportingSchema || isExportingBuckets}
              variant="outline"
              className="w-full"
            >
              <FileCode2 className="w-4 h-4 mr-2" />
              {isExportingSql ? "Gerando SQL..." : "Exportar em SQL"}
            </Button>
            <Button
              onClick={handleExportSchema}
              disabled={isExporting || isExportingSql || isExportingSchema || isExportingBuckets}
              variant="outline"
              className="w-full"
            >
              <Blocks className="w-4 h-4 mr-2" />
              {isExportingSchema ? "Gerando estrutura..." : "Exportar estrutura SQL"}
            </Button>
            <Button
              onClick={handleExportBuckets}
              disabled={isExporting || isExportingSql || isExportingSchema || isExportingBuckets}
              variant="outline"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExportingBuckets ? "Exportando arquivos..." : "Exportar todos os buckets"}
            </Button>
          </div>

          <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            <Database className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Exporte primeiro a estrutura e depois os dados para migrar. O botão de buckets baixa os arquivos enviados em um ZIP separado; usuários de acesso e chaves secretas não são incluídos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Importar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importar Banco de Dados
          </CardTitle>
          <CardDescription>
            Importe dados de um arquivo de backup JSON previamente exportado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backup-file">Arquivo de Backup</Label>
            <Input
              id="backup-file"
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              disabled={isImporting}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {selectedFile.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Modo de Importação</Label>
            <RadioGroup
              value={importMode}
              onValueChange={(value) => setImportMode(value as "merge" | "replace")}
              className="space-y-2"
            >
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="merge" id="merge" />
                <div>
                  <Label htmlFor="merge" className="font-normal cursor-pointer">
                    Mesclar (Merge)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Adiciona novos registros e atualiza existentes pelo ID
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="replace" id="replace" />
                <div>
                  <Label htmlFor="replace" className="font-normal cursor-pointer">
                    Substituir (Replace)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-destructive font-medium">ATENÇÃO:</span> Remove todos os dados atuais e importa os do arquivo
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {isImporting && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Importando dados... {progress}%
              </p>
            </div>
          )}

          {importResult && (
            <Card className={importResult.success ? "border-primary" : "border-destructive"}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  {importResult.success ? (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                  <span className="font-medium">
                    Resultado da Importação
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Registros importados</p>
                    <p className="text-2xl font-bold text-primary">{getTotalImported()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Erros</p>
                    <p className={`text-2xl font-bold ${getTotalErrors() > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {getTotalErrors()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button 
            onClick={handleImportClick}
            disabled={isImporting || !selectedFile}
            variant={importMode === "replace" ? "destructive" : "default"}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isImporting ? "Importando..." : "Importar Backup"}
          </Button>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className={importMode === "replace" ? "text-destructive" : "text-yellow-500"} />
              Confirmar Importação
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Você está prestes a importar dados no modo <strong>{importMode === "merge" ? "Mesclar" : "Substituir"}</strong>.
                </p>
                {importMode === "replace" && (
                  <div className="bg-destructive/10 p-3 rounded-md border border-destructive/20">
                    <p className="text-destructive font-medium">
                      ⚠️ ATENÇÃO: O modo Substituir irá APAGAR todos os dados atuais antes de importar!
                    </p>
                    <p className="text-sm mt-1">
                      Esta ação não pode ser desfeita. Certifique-se de ter um backup antes de continuar.
                    </p>
                  </div>
                )}
                <p>Deseja continuar?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              onClick={handleImport}
              variant={importMode === "replace" ? "destructive" : "default"}
            >
              Confirmar Importação
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
