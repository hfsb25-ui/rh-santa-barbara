import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCheck2, PenLine, Eye, ArrowLeft, Download } from "lucide-react";
import { AssinaturaHoleriteWizard } from "@/components/holerites-assinatura/AssinaturaHoleriteWizard";
import { AuditoriaHoleriteDialog } from "@/components/holerites-assinatura/AuditoriaHoleriteDialog";
import { AssinaturaDocumentoHoleriteWizard } from "@/components/holerites-assinatura/AssinaturaDocumentoHoleriteWizard";
import { toast } from "sonner";

const MESES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const COMPETENCIA_INICIAL_COLABORADOR = "ano.gt.2026,and(ano.eq.2026,mes.gte.9)";

export default function MeusHolerites() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<any>(null);
  const [empresa, setEmpresa] = useState<any>(null);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [assinaturas, setAssinaturas] = useState<Record<string, any>>({});
  const [selected, setSelected] = useState<any>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [selectedDocumento, setSelectedDocumento] = useState<any>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    const { data: emp } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!emp) {
      setLoading(false);
      return;
    }
    setEmployee(emp);
    const { data: docs } = await supabase
      .from("holerite_documentos" as any)
      .select("*")
      .eq("employee_id", emp.id)
      .or(COMPETENCIA_INICIAL_COLABORADOR)
      .order("ano", { ascending: false })
      .order("mes", { ascending: false });
    setDocumentos((docs as any[]) || []);
    if (emp.empresa_id) {
      const { data: em } = await supabase
        .from("empresas")
        .select("nome, cnpj, logo_url, endereco")
        .eq("id", emp.empresa_id)
        .maybeSingle();
      setEmpresa(em);
    }
    const { data: pags } = await supabase
      .from("folha_pagamento")
      .select(`
        *, folha_pagamento_itens(id, variavel_id, valor, variaveis_folha(id, nome, codigo, tipo))
      `)
      .eq("employee_id", emp.id)
      .neq("status", "rascunho")
      .or(COMPETENCIA_INICIAL_COLABORADOR)
      .order("ano", { ascending: false })
      .order("mes", { ascending: false });
    const filtrados = (pags || []).filter((p) => p.tipo_folha !== "diferenca");
    setPagamentos(filtrados);
    if (filtrados.length) {
      const { data: ass } = await supabase
        .from("holerite_assinaturas")
        .select("*")
        .in("folha_pagamento_id", filtrados.map((p) => p.id));
      const map: Record<string, any> = {};
      (ass || []).forEach((a) => (map[a.folha_pagamento_id] = a));
      setAssinaturas(map);
    }
    setLoading(false);
  }

  const pendentes = pagamentos.filter((p) => !assinaturas[p.id] || assinaturas[p.id].status !== "assinado");
  const assinados = pagamentos.filter((p) => assinaturas[p.id]?.status === "assinado");

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <h1 className="text-2xl font-bold">Meus Holerites</h1>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : !employee ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Nenhum cadastro de funcionário vinculado ao seu acesso.
          </CardContent>
        </Card>
      ) : (
        <>
          {documentos.filter((documento) => documento.status !== "assinado").length > 0 && (
            <Card className="border-orange-300 bg-orange-50/40">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PenLine className="h-4 w-4 text-orange-600" /> PDFs pendentes de assinatura</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {documentos.filter((documento) => documento.status !== "assinado").map((documento) => (
                  <div key={documento.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                    <div><div className="font-medium">{MESES[documento.mes]}/{documento.ano}</div><div className="text-sm text-muted-foreground">{documento.arquivo_nome}</div></div>
                    <Button onClick={() => setSelectedDocumento(documento)}><PenLine className="mr-2 h-4 w-4" /> Assinar</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {documentos.some((documento) => documento.status === "assinado") && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileCheck2 className="h-4 w-4 text-green-600" /> PDFs assinados</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {documentos.filter((documento) => documento.status === "assinado").map((documento) => (
                  <div key={documento.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div><div className="flex items-center gap-2 font-medium">{MESES[documento.mes]}/{documento.ano}<Badge variant="secondary" className="bg-green-100 text-green-800">Assinado</Badge></div><div className="text-xs font-mono text-muted-foreground">{documento.protocolo}</div></div>
                    <Button variant="outline" onClick={async () => {
                      const path = documento.pdf_assinado_path || documento.arquivo_path;
                      const bucket = documento.pdf_assinado_path ? "holerites-assinados" : "holerites-importados";
                      const { data, error } = await supabase.storage.from(bucket).download(path);
                      if (error || !data) return toast.error("Não foi possível baixar o holerite");
                      const url = URL.createObjectURL(data);
                      const anchor = document.createElement("a");
                      anchor.href = url;
                      anchor.download = documento.arquivo_nome;
                      anchor.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}><Download className="mr-2 h-4 w-4" /> Baixar</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {pendentes.length > 0 && (
            <Card className="border-orange-300 bg-orange-50/40">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PenLine className="w-4 h-4 text-orange-600" />
                  Pendentes de assinatura ({pendentes.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendentes.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 border rounded-lg p-3 bg-background"
                  >
                    <div>
                      <div className="font-medium">
                        {MESES[p.mes]}/{p.ano}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({p.tipo_folha})
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Líquido: R${" "}
                        {p.valor_liquido?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setSelected(p);
                        setShowWizard(true);
                      }}
                    >
                      <PenLine className="w-4 h-4 mr-2" /> Assinar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-green-600" />
                Holerites assinados ({assinados.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {assinados.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum holerite assinado ainda.</p>
              )}
              {assinados.map((p) => {
                const a = assinaturas[p.id];
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 border rounded-lg p-3"
                  >
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {MESES[p.mes]}/{p.ano}
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Assinado
                        </Badge>
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        {a.protocolo}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={async () => {
                          const { gerarHoleritePdf } = await import("@/lib/pdfGeneratorHolerite");
                          const { carregarAssinaturaHolerite } = await import("@/lib/holeriteAssinaturaLoader");
                          const assinatura = await carregarAssinaturaHolerite(p.id);
                          await gerarHoleritePdf(p, empresa, employee, { assinatura });
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" /> Baixar
                      </Button>
                      <Button variant="outline" onClick={() => setAuditId(a.id)}>
                        <Eye className="w-4 h-4 mr-2" /> Detalhes
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}

      {selected && empresa && employee && (
        <AssinaturaHoleriteWizard
          open={showWizard}
          onOpenChange={(o) => {
            setShowWizard(o);
            if (!o) load();
          }}
          pagamento={selected}
          employee={employee}
          empresa={empresa}
          employeeId={employee.id}
          empresaId={empresa.id || ""}
          onSigned={() => load()}
        />
      )}

      {selectedDocumento && (
        <AssinaturaDocumentoHoleriteWizard
          open={!!selectedDocumento}
          onOpenChange={(open) => { if (!open) { setSelectedDocumento(null); load(); } }}
          documento={selectedDocumento}
          onSigned={load}
        />
      )}

      <AuditoriaHoleriteDialog
        open={!!auditId}
        onOpenChange={(o) => !o && setAuditId(null)}
        assinaturaId={auditId}
      />
    </div>
  );
}
