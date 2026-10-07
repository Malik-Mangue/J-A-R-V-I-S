# Implementation Notes

> Registo das decisões técnicas tomadas durante a implementação, do que está
> concluído e do que **não** está. Mantido em sincronização com o código.
>
> Este documento existe porque `docs/AGENT-INSTRUCTIONS.md` exige: identificar
> inconsistências, distinguir dúvidas de negócio de decisões técnicas e
> documentar as decisões.

---

## 1. Estado atual

Implementado e testado o **primeiro vertical slice** definido em
`docs/AGENT-INSTRUCTIONS.md` e `docs/ARCHITECTURE.md #50`:

```text
Captura (texto/áudio)
   ↓
Transcrição (abstrata)
   ↓
Interpretação (IA)
   ↓
Proposta + Prévia
   ↓
Confirmação humana
   ↓
Tarefa / Ideia / Projeto / Registo financeiro
   ↓
PostgreSQL
   ↓
Homepage
```

### Funcionalidades reais (não protótipos)

| Área | Estado |
|------|--------|
| Captura por texto | ✅ completo |
| Captura por áudio (upload + validação) | ✅ completo (`parseAudioUpload`, tipo inferido pela extensão quando o browser não declara, duração/idioma nunca inventados) |
| Gravação no navegador (cronómetro, limite de 3 min, retry offline) | ✅ completo (`VoiceRecorder`: micro libertado ao sair, texto parcial ao vivo, reenvio manual/automático sem perder a gravação) |
| Hash de proveniência + reutilização em áudios repetidos | ✅ completo (SHA-256 em `captureVoice`; áudio idêntico reusa a transcrição com `+reused` e evento `transcription.completed`) |
| Transcrição de áudio | ⚠️ duas vias reais: reconhecimento no navegador (sem chave) ou `TRANSCRIPTION_PROVIDER=openai` |
| Interpretação determinística (PT) | ✅ completo |
| Interpretação por modelo (OpenAI-compatible) | ✅ implementado, desligado por omissão |
| Validação de schema da saída da IA | ✅ completo |
| Proposta + prévia + confirmar / editar / descartar | ✅ completo |
| Correção de proposta por voz/texto (`correctProposalByVoice`) | ✅ completo |
| Tarefas (criar, concluir, listar, atrasos) | ✅ completo |
| Ideias (nunca convertidas automaticamente) | ✅ completo |
| Conversão de ideias em tarefa/projeto pela UI | ✅ completo (explícita, com data obrigatória para tarefa) |
| Projetos (criar, listar, detetar inatividade) | ✅ parcial |
| Registo financeiro de receitas/despesas | ✅ completo (moeda obrigatória, sem default inventado) |
| Página de finanças (resumo do mês, categorias, movimentos) | ✅ completo |
| Inbox (leitura) | ✅ completo |
| Inbox (resolver / adiar / dispensar) | ✅ completo |
| Sugestões (`detectSuggestions` + materialização) | ✅ completo; materializar exige automação activa |
| Automação por categoria (definições) | ✅ completo; tudo desligado por omissão |
| Dashboard "Hoje / Esta semana / Finanças / Sugestões" | ✅ completo |
| Definições (utilizador, fornecedores, moeda) | ✅ completo |
| PWA (manifest + instalação) | ✅ parcial; sem offline |
| Revisões semanais | ❌ não implementado |
| Orçamentos, dívidas, pagamentos | ❌ não implementado |
| Projeção para Obsidian | ❌ não implementado |

Nada de ecrãs vazios com dados falsos. Onde a funcionalidade não existe, a
interface diz "não há dados" em vez de simular.

---

## 2. Decisões técnicas

Formato segundo `docs/ARCHITECTURE.md #20`.

### 2.1 Base de dados: PostgreSQL real, não simulação

```text
Problem      : a documentação exige PostgreSQL como fonte de verdade, mas o
               ambiente de desenvolvimento não tem servidor PostgreSQL nem
               acesso a instalação com privilégios.
Constraints  : "Não criar dados falsos como substituição permanente";
               as migrações têm de ser reais.
Alternatives : (a) SQLite — viola a documentação;
               (b) servidor PostgreSQL instalado pelo sistema — impossível sem
                   privilégios e não portável;
               (c) PostgreSQL embebido (PGlite, motor PostgreSQL 16 compilado
                   para WebAssembly), persistido em disco;
               (d) usar um serviço externo — adiciona custo e dependência.
Evaluation   : (c) é o mesmo motor PostgreSQL, usa o mesmo SQL e permite subir
               para um servidor real sem alterar uma linha do domínio.
Decision     : `src/infrastructure/database/client.js` expõe UMA interface
               (`query` / `exec` / `transaction` / `close`) com dois drivers:
               `postgres` (via `pg`, quando `DATABASE_URL` existe) e `pglite`
               (por omissão).
Consequences : o SQL das migrações é idêntico nos dois casos; basta definir
               `DATABASE_URL` para produção.
```

### 2.2 Sem ORM — SQL e migrações explícitos

```text
Problem      : escolher a ferramenta de acesso a dados.
Alternatives : Prisma, Drizzle, Kysely, SQL direto.
Decision     : SQL direto + runner de migrações em `migrations/*.sql`.
Rationale    : a documentação pede rastreabilidade e controlo total sobre o
               modelo; o esquema é pequeno; evita dependências pesadas e
               passos de geração.
Consequences : mais SQL manual; migrações explícitas e auditáveis.
```

### 2.3 Fornecedor de IA: motor determinístico por omissão

```text
Problem      : o produto precisa interpretar linguagem natural, mas nenhum
               fornecedor foi escolhido e não existem chaves de API.
Constraints  : "Não invente um fornecedor"; a cadeia tem de funcionar e ser
               testável; decisões técnicas podem ser tomadas autonomamente
               quando justificadas.
Decision     : `AI_PROVIDER=rule` (determinístico, offline, sem chaves) por
               omissão. `AI_PROVIDER=openai` ativa um adaptador
               OpenAI-compatible que usa `docs/SYSTEM-PROMPT.md` como system
               prompt.
Rationale    : o motor determinístico NÃO é um duplo de teste — é um motor de
               regras real (classificação por marcadores + parser temporal
               determinístico). Garante que o fluxo funciona, é testável e
               reproduzível. O adaptador de modelo implementa exatamente a
               mesma porta, portanto nada mais muda.
Consequences : a qualidade com português natural é inferior à de um modelo;
               é o ponto honesto a melhorar.
```

### 2.4 Valores monetários em unidades inteiras

```text
Problem   : dinheiro não pode ser float (docs/ARCHITECTURE.md #21).
Decision  : `amount_minor bigint` + moeda ISO. `parseAmountToMinor` aceita
            "46", "46,50", "1.234,56".
Consequence : a formatação é feita apenas na fronteira de apresentação.
```

### 2.5 Server Actions em vez de API artificial

```text
Problem   : não criar uma API para tudo (docs/ARCHITECTURE.md #30).
Decision  : mutações internas usam Server Actions (`app/actions/capture.js`).
            Existe apenas um Route Handler real: `POST /api/capture/audio`,
            porque upload multipart exige uma interface HTTP.
```

---

## 3. Inconsistências encontradas na documentação

1. **Prazo da tarefa.** `docs/README.md #6` diz que uma tarefa sem "prazo
   adequado" não deve ser criada e `docs/AI-CONTRACT.md #8` exemplifica
   "Task requires a concrete date", mas `docs/ARCHITECTURE.md #3` mostra uma
   prévia com *período* ("próxima semana") e sem data concreta.
   **Decisão implementada:** deadline **ou** período é obrigatório; sem nenhum
   dos dois o sistema pergunta.
   *Dúvida de negócio a confirmar:* o período deve mesmo bastar?

2. **Ficheiro inexistente.** O `README.md` raiz refere `ai/TOOL-CONTRACTS.md`,
   que não existe (os ficheiros reais são `docs/TOOL-CONTRACT.md` e
   `ai/MASTER-PROMPT.md`).

3. **Ferramentas da IA ainda não expostas.** `docs/TOOL-CONTRACT.md` descreve
   `search_projects`, `get_week_context`, etc. Nesta fase a aplicação monta o
   contexto ela própria (`src/application/context.js`), que cumpre o mesmo
   objetivo sem expor ferramentas ao modelo.

4. **Âmbito da base de dados.** `docs/ARCHITECTURE.md #24` lista `budgets`,
   `debts`, `payments`, `financial_commitments`, `suggestions`, `reviews` e
   `integrations`. Não foram criadas: a própria documentação diz para não criar
   tabelas sem necessidade, e os casos de uso ainda não existem.

5. **Captura sem intenção acionável.** Não está definido se uma frase que não é
   tarefa/ideia/despesa precisa de confirmação. Implementação: também passa por
   proposta, mas a nota **não** cria um registo novo — a nota é a própria captura.

---

## 4. Pressupostos explícitos

* Fuso horário por omissão: `Africa/Maputo` (configurável em `APP_TIMEZONE`).
* A semana começa à segunda-feira (convenção pt-PT).
* Moeda por omissão: `DEFAULT_CURRENCY` (`.env`). **Não há moeda inventada:**
  se não estiver definida e o utilizador não indicar a moeda, o sistema pergunta
  (`src/domain/finance/financeEntry.js`).
* `END_OF_MONTH_START_DAY` (por omissão `25`): "fim do mês" começa nesse dia e
  vai até ao último dia do mês. A política vive em `src/shared/dates/policies.js`,
  não embebida na função.
* Automação: todas as categorias começam em `false` (`DEFAULT_AUTOMATION`);
  só o utilizador as activa em `/settings`.
* Modo mono-utilizador: `user_local`, mas todas as entidades têm `user_id` e
  todo o acesso passa por `assertOwnership` (`src/application/authorization`).

---

## 5. Como executar

```bash
npm install
cp .env.example .env.local     # opcional
npm run migrate               # cria/actualiza a base de dados
npm run dev                   # http://localhost:3000
npm test                      # unit + integração
```

Para usar um PostgreSQL servidor real basta definir `DATABASE_URL`.

---

## 6. Próximos passos sugeridos (pela ordem da documentação)

1. ~~Conversão de ideias em tarefa/projeto com autorização explícita.~~ ✅ feito
2. ~~Inbox com escrita (resolver/dispensar/adiar) e criação a partir de sugestões.~~ ✅ feito
3. Revisões semanais (FACT / OBSERVATION / INTERPRETATION / SUGGESTION).
4. Orçamentos, dívidas e pagamentos.
5. Projeção para Obsidian (`Database → Markdown`, uma direção).
6. Fila local de capturas para ligações instáveis (parcial: o `VoiceRecorder`
   já mantém a gravação em memória e reenvia quando a ligação volta; falta
   persistir entre sessões).
7. Sincronização real com Obsidian (hoje só existe a categoria de automação).

---

## 7. Auditoria de conformidade — violações encontradas e corrigidas

Revisão doc-a-doc (`docs/README.md`, `ARCHITECTURE.md`, `AI-CONTRACT.md`,
`SYSTEM-PROMPT.md`, `MASTER-PROMPT.md`, `AGENT-INSTRUCTIONS.md`) contra o
código. Correções aplicadas:

| Violação | Regra dos documentos | Correção |
|----------|----------------------|----------|
| Prioridade ausente virava `MEDIUM` por omissão | "Never invent defaults" / perguntar quando em falta | `normalizePriority` devolve `null`; a prioridade só existe se foi dita (`src/application/proposal/…`) |
| Moeda ausente virava `MZN` por omissão | `AI-CONTRACT.md`: "If the currency is unknown and it matters, ask" | `extractAmount` devolve `currency: null` e a falta entra em `missingInformation`; `createFinanceEntry` lança erro sem moeda; migração `0002_no_invented_defaults.sql` remove o `DEFAULT`/`NOT NULL` |
| `END_OF_MONTH_START_DAY = 25` embebido na função | pressupostos têm de ser explícitos e configuráveis | extraído para `src/shared/dates/policies.js` (`END_OF_MONTH_START_DAY`) |
| Sem controlo de autorização nas mutações | mono-utilizador não elimina `user_id` | `src/application/authorization/index.js`: `assertOwnership`, `resolveExecutionPolicy`, `automationCategoryForIntent`; usado em `confirmProposal`, `cancelProposal`, `updateProposal`, `correctProposalByVoice`, `completeTask`, `updateInboxItem`, `convertIdea`, `generateSuggestions` |
| Ambiguidade de projeto não bloqueava a proposta | `ARCHITECTURE.md #14`: nunca adivinhar | `buildProposalPayload` empurra `ambiguities` para `missingInformation`, o que torna a proposta não acionável |
| Nomes de eventos de auditoria espalhados | `ARCHITECTURE.md #37` | centralizados em `entityEvent()` (`src/domain/shared/constants.js`) |
| Moeda por omissão fixa no código | configuração explícita | `DEFAULT_CURRENCY` → `config.app.defaultCurrency` → `container.defaultCurrency` → `createFinanceEntry` |
| Sugestões calculadas em dois sítios | sem duplicação de regra | `getDashboard` chama `detectSuggestions()`; a materialização é `generateSuggestions` (exige automação) |
| `ruleBasedProvider` referenciava `warnings` inexistente | robustez | passou para `uncertainties`, que `buildProposalPayload` converte em avisos da proposta |
| Correção de proposta por voz não existia | `README.md #10` (Confirmar/Editar/Corrigir/Descartar) | `correctProposalByVoice` + `POST`-free Server Action + formulário na prévia |
| Áudio só transacionava no servidor | voz tem de funcionar sem chave | `VoiceRecorder` usa `SpeechRecognition` no navegador quando existe; caso contrário faz upload para `POST /api/capture/audio` |
| `captures.hash` nunca era calculado (o README lista o hash como proveniência) | proveniência obrigatória do áudio | `captureVoice` calcula `sha256:<hex>` e guarda-o na coluna `hash` |
| Evento documentado `transcription.completed` (`ARCHITECTURE.md #37`) nunca era emitido | conformidade com os docs | emitido nos dois caminhos da transcrição (real e reutilizada) |
| Áudio repetido era sempre retranscrito (custo + resultados divergentes) | não duplicar trabalho | reutilização por hash idêntico: provider `…+reused`, payload `reused: true`, `sourceCaptureId`; nunca disfarçado de transcrição nova |
| Upload aceitava `durationMs`/`language` inválidos e falhava com MIME vazio no iOS | honestidade do metadados + telemóvel primeiro | `parseAudioUpload` (puro, testado): duração/idioma inválidos → `null` (desconhecido), tipo inferido pela extensão, tamanho/tipo errados → 413/415 |
| Transcrição do servidor nunca era visível no ecrã | o utilizador tem de poder verificar/corrigir | `CapturePanel` mostra a proveniência (dispositivo/servidor + fornecedor) e pré-preenche a caixa de texto com a transcrição |
| Gravação sem cronómetro, sem limite e com micro preso ao sair da página | UX e privacidade (PWA móvel) | cronómetro visível, corte automático aos 3 min, `cleanup` no unmount que para reconhecimento, recorder e tracks |
| Upload falhado perdia o áudio (offline = perda de dados) | captura não pode desaparecer | gravação mantida em memória: botão "Repetir envio" + reenvio automático no evento `online` |
| Caminho de áudio sem qualquer teste | `ARCHITECTURE.md #38` E2E "Record audio → Transcribe → … → Task" | `tests/integration/audioPipeline.test.js` (4 testes) + `tests/unit/transcription.test.js` + `tests/unit/audioUpload.test.js` |
| Botões `submit` concorrentes num só formulário (conversão de ideia) | correcção de UI | cada botão define `name="target"` com o seu valor |
| Checkbox não enviado quando desligado | automação tem de ser determinística | formulário envia `off` oculto por categoria; a ação lê `getAll(...).includes("on")` |

Verificado depois das correções: `npx next build` ✅, `npx next lint` ✅, `npm test`
(78 testes, inclui `tests/integration/auditCompliance.test.js`,
`tests/integration/audioPipeline.test.js` e os unitários de áudio/transcrição) ✅,
`next start` com todas as rotas a responder `200` e `POST /api/capture/audio` a
validar `400/413/415` sem processar ficheiros inválidos ✅.