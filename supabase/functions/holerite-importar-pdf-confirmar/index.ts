// Edge function: persiste holerites extraídos como RASCUNHO
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RubricaIn {
  codigo?: string | null;
  descricao?: string | null;
  valor: number;
  variavel_id?: string | null;
}

interface HoleriteIn {
  employee_id: string;
  empresa_id: string;
  mes: number;
  ano: number;
  tipo_folha: string;
  valor_bruto: number;
  descontos_total: number;
  valor_liquido: number;
  proventos: RubricaIn[];
  descontos: RubricaIn[];
  observacoes?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supaUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData } = await supaUser.auth.getClaims(token);
    if (!claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: rolesData } = await supa
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (rolesData || []).map((r: any) => r.role);
    if (!roles.includes("admin") && !roles.includes("gestor")) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { holerites, sobrescrever } = (await req.json()) as {
      holerites: HoleriteIn[];
      sobrescrever?: boolean;
    };
    if (!Array.isArray(holerites) || holerites.length === 0) {
      return new Response(JSON.stringify({ error: "Lista vazia" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let criados = 0;
    let sobrescritos = 0;
    let pulados = 0;
    const erros: string[] = [];

    for (const h of holerites) {
      try {
        if (!h.employee_id || !h.empresa_id || !h.mes || !h.ano) {
          pulados++;
          erros.push(
            `Holerite ignorado: faltam dados (employee_id=${!!h.employee_id}, empresa_id=${!!h.empresa_id}, mes=${h.mes}, ano=${h.ano})`
          );
          continue;
        }

        const toNum = (v: any) => {
          if (v === null || v === undefined) return 0;
          if (typeof v === "number") return v;
          const s = String(v).replace(/\./g, "").replace(",", ".");
          const n = Number(s);
          return isNaN(n) ? 0 : n;
        };

        const tipoFolha = h.tipo_folha || "salario";

        const { data: existing, error: errExist } = await supa
          .from("folha_pagamento")
          .select("id, status")
          .eq("employee_id", h.employee_id)
          .eq("mes", h.mes)
          .eq("ano", h.ano)
          .eq("tipo_folha", tipoFolha)
          .maybeSingle();
        if (errExist) {
          erros.push(`Erro ao consultar holerite existente: ${errExist.message}`);
          continue;
        }

        let foiSobrescrito = false;
        if (existing) {
          if (!sobrescrever) {
            pulados++;
            continue;
          }
          if (existing.status === "aprovado" || existing.status === "pago") {
            erros.push(
              `Holerite ${h.mes}/${h.ano} ja aprovado/pago - nao foi sobrescrito`
            );
            pulados++;
            continue;
          }
          await supa.from("folha_pagamento_itens").delete().eq("folha_pagamento_id", existing.id);
          const { error: errDel } = await supa.from("folha_pagamento").delete().eq("id", existing.id);
          if (errDel) {
            erros.push(`Erro ao remover holerite anterior: ${errDel.message}`);
            continue;
          }
          foiSobrescrito = true;
        }

        const { data: folha, error: errFolha } = await supa
          .from("folha_pagamento")
          .insert({
            employee_id: h.employee_id,
            empresa_id: h.empresa_id,
            mes: h.mes,
            ano: h.ano,
            tipo_folha: tipoFolha,
            valor_bruto: toNum(h.valor_bruto),
            descontos: toNum(h.descontos_total),
            desconto: 0,
            valor_liquido: toNum(h.valor_liquido),
            status: "rascunho",
            observacoes: h.observacoes || "Importado via PDF (IA)",
            created_by: userId,
          })
          .select("id")
          .single();

        if (errFolha || !folha) {
          erros.push(`Erro ao criar folha (emp=${h.employee_id} ${h.mes}/${h.ano}): ${errFolha?.message}`);
          continue;
        }

        const itens = [
          ...(h.proventos || [])
            .filter((p) => p.variavel_id && toNum(p.valor) > 0)
            .map((p) => ({ folha_pagamento_id: folha.id, variavel_id: p.variavel_id!, valor: toNum(p.valor) })),
          ...(h.descontos || [])
            .filter((d) => d.variavel_id && toNum(d.valor) > 0)
            .map((d) => ({ folha_pagamento_id: folha.id, variavel_id: d.variavel_id!, valor: toNum(d.valor) })),
        ];
        if (itens.length) {
          const { error: errItens } = await supa.from("folha_pagamento_itens").insert(itens);
          if (errItens) erros.push(`Erro ao inserir itens: ${errItens.message}`);
        }

        if (foiSobrescrito) sobrescritos++;
        else criados++;
      } catch (e: any) {
        erros.push(e?.message || "Erro desconhecido");
      }
    }

    return new Response(
      JSON.stringify({ criados, sobrescritos, pulados, erros }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[holerite-importar-pdf-confirmar]", e);
    return new Response(
      JSON.stringify({ error: e?.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
