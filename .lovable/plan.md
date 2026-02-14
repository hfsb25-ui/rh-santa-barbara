

# Otimizacao do Cerebrum: Retrieval via Tools

## Problema Atual
Cada mensagem no WhatsApp (e na web) dispara **35+ queries ao banco** e injeta **todos os dados do RH** no system prompt — funcionarios, ferias, faltas, ponto, folha, adiantamentos, TACs, estoque, vagas, treinamentos, eventos, etc. Isso consome milhares de tokens desnecessarios quando o usuario so quer saber, por exemplo, "quem esta de ferias?".

## Solucao: Retrieval sob Demanda

Em vez de enviar tudo no prompt, o Cerebrum recebera apenas um **resumo minimo** (contagens gerais) e usara **tools de consulta** para buscar dados especificos quando necessario. A IA decidira quais tools chamar com base na pergunta do usuario.

---

## Arquitetura Nova

```text
ANTES (atual):
  Mensagem -> 35 queries -> Tudo no prompt -> IA responde
  Tokens: ~15.000-25.000 por mensagem

DEPOIS (otimizado):
  Mensagem -> 3 queries (resumo + memorias + historico) -> Prompt enxuto -> IA chama tools -> Resposta
  Tokens: ~2.000-5.000 por mensagem (reducao de 70-80%)
```

---

## Plano de Implementacao

### 1. Criar Tools de Consulta (novos tools para a IA)

Adicionar os seguintes tools ao array `toolDefinitions`:

| Tool | Descricao | Quando a IA usa |
|------|-----------|-----------------|
| `consultar_funcionarios` | Busca funcionarios por nome, setor, status, cargo | "quem trabalha na cozinha?", "dados do Joao" |
| `consultar_ferias` | Ferias atuais, futuras e planejadas | "quem esta de ferias?", "escala de ferias" |
| `consultar_faltas_folgas` | Faltas e folgas dos ultimos 90 dias | "faltas nao justificadas", "folgas do mes" |
| `consultar_ponto_banco_horas` | Registros de ponto e saldos de banco de horas | "saldo de horas do Joao", "banco de horas" |
| `consultar_financeiro` | Folha, adiantamentos, reajustes | "adiantamentos do mes", "folha de pagamento" |
| `consultar_tacs_avaliacoes` | TACs e avaliacoes de desempenho | "TACs pendentes", "avaliacoes" |
| `consultar_estoque` | EPIs e uniformes em estoque | "estoque de EPIs", "uniformes em falta" |
| `consultar_recrutamento` | Vagas e candidaturas | "vagas abertas", "candidatos pendentes" |
| `consultar_treinamentos` | Cursos, progresso e certificados | "cursos obrigatorios", "quem completou treinamento" |
| `consultar_eventos_avisos` | Eventos e avisos ativos | "proximos eventos", "avisos ativos" |
| `consultar_saude_ocupacional` | Exames, encaminhamentos, afastamentos | "exames pendentes", "quem esta afastado" |
| `consultar_checklists` | Checklists de admissao/desligamento | "checklists pendentes" |
| `consultar_resumo_geral` | Resumo completo com contagens (para visao geral) | "resumo do RH", "como esta o RH hoje" |

### 2. Substituir `fetchSystemData` por `fetchResumoMinimo`

A nova funcao `fetchResumoMinimo` fara apenas **3-5 queries leves** para fornecer um contexto basico:
- Contagem de funcionarios ativos por status
- Setores e empresas (listas curtas)
- Contagens de pendencias (TACs, avaliacoes, checklists, exames)
- Alertas criticos (estoque baixo, afastamentos ativos)

Isso fornece contexto suficiente para a IA decidir quais tools chamar.

### 3. Implementar funcoes handler para cada tool

Cada tool tera uma funcao async que executa as queries especificas e retorna dados formatados. Por exemplo:

- `consultar_funcionarios({nome: "Joao", setor: "Cozinha", status: "ativo"})` faz query filtrada na tabela employees
- `consultar_ferias({tipo: "atuais"})` busca so ferias em gozo atual
- `consultar_ponto_banco_horas({nome_funcionario: "Maria"})` busca saldo especifico

### 4. Atualizar o system prompt

O prompt passara a instruir a IA:
- "Voce tem acesso a tools de consulta. Use-os para buscar dados antes de responder."
- "NAO invente dados. Se precisar de informacoes, use o tool adequado."
- "Para perguntas gerais ('como esta o RH?'), use consultar_resumo_geral."

### 5. Atualizar o loop de tool calls

O loop atual so suporta 1 rodada de tool calls. Sera expandido para suportar **ate 3 rodadas**, permitindo que a IA faca multiplas consultas sequenciais se necessario.

### 6. Aplicar a mesma logica no `ai-assistant`

A funcao `ai-assistant/index.ts` (web) recebera as mesmas otimizacoes, mantendo paridade entre WhatsApp e web.

---

## Detalhes Tecnicos

### Arquivos modificados:
- `supabase/functions/whatsapp-ai/index.ts` — refatoracao completa
- `supabase/functions/ai-assistant/index.ts` — mesma refatoracao

### Impacto estimado:
- **Tokens por mensagem**: de ~20.000 para ~3.000-5.000 (reducao de 75%)
- **Latencia**: reducao de ~2-3s nas queries iniciais (so busca o necessario)
- **Custo**: reducao proporcional ao consumo de tokens
- **Precisao**: mantida — a IA busca exatamente os dados que precisa

### Trade-offs:
- Perguntas muito amplas ("me conte tudo") podem precisar de 2-3 tool calls em sequencia, adicionando ~1s de latencia
- A IA precisa ser boa em decidir qual tool usar (Gemini e GPT-4o lidam bem com isso)

