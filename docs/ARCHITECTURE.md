# Personal Second Brain — Architecture

## 1. Objetivo

Este documento define a arquitetura técnica do Personal Second Brain.

O sistema é uma aplicação pessoal, mobile-first, orientada a voz e texto, destinada a capturar, interpretar, organizar, acompanhar e analisar informações pessoais.

O objetivo arquitetural é permitir que o sistema cresça de um aplicativo pessoal para uma plataforma potencialmente multiutilizador sem obrigar a reconstruir o núcleo do sistema.

A arquitetura deve preservar cinco propriedades fundamentais:

1. O utilizador continua sendo a autoridade sobre mudanças importantes.
2. A IA interpreta e sugere, mas não inventa fatos.
3. PostgreSQL é a fonte de verdade.
4. Obsidian é uma integração/projeção, não uma dependência.
5. A lógica de negócio não deve ficar presa à interface ou ao fornecedor de IA.

---

# 2. Visão geral

```text
                         ┌─────────────────────┐
                         │       UTILIZADOR    │
                         │                     │
                         │  Voz / Texto        │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     MOBILE / WEB    │
                         │     React + PWA      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                    ┌────────────────────────────────┐
                    │            NEXT.JS              │
                    │                                │
                    │  Presentation                  │
                    │  Application                  │
                    │  Domain                        │
                    │  Infrastructure                │
                    └───────────────┬────────────────┘
                                    │
                  ┌─────────────────┼──────────────────┐
                  │                 │                  │
                  ▼                 ▼                  ▼
          ┌──────────────┐  ┌───────────────┐  ┌───────────────┐
          │ PostgreSQL   │  │ AI Provider   │  │ Transcription │
          │              │  │ Adapter       │  │ Provider      │
          │ SOURCE OF    │  │               │  │               │
          │ TRUTH        │  │ OpenAI /      │  │ Provider      │
          │              │  │ Gemini / etc.  │  │ abstraction   │
          └──────┬───────┘  └───────────────┘  └───────────────┘
                 │
                 │ confirmed data
                 ▼
          ┌────────────────────┐
          │ Obsidian Projection│
          │                    │
          │ Markdown / links   │
          └────────────────────┘
```

O fluxo principal nunca deve ser:

```text
Áudio → Obsidian
```

O fluxo correto é:

```text
Áudio
  ↓
Captura
  ↓
Transcrição
  ↓
Interpretação
  ↓
Proposta estruturada
  ↓
Validação
  ↓
Pré-visualização
  ↓
Confirmação humana
  ↓
PostgreSQL
  ↓
Integrações / Obsidian
```

---

# 3. Princípio arquitetural central

O sistema deve separar quatro conceitos:

```text
INPUT
  ↓
INTERPRETATION
  ↓
CONFIRMED DOMAIN DATA
  ↓
PROJECTION
```

Isso evita um dos maiores riscos do projeto:

> permitir que uma interpretação da IA seja tratada como fato antes de o utilizador confirmar.

Por exemplo:

O utilizador diz:

> "Preciso terminar o módulo de autenticação na próxima semana."

A IA pode interpretar:

```json
{
  "type": "task",
  "title": "Terminar o módulo de autenticação",
  "period": "next_week",
  "deadline": null,
  "confidence": 0.94
}
```

Isso ainda NÃO é uma tarefa confirmada.

O sistema deve apresentar:

```text
Entendi:

Tarefa:
Terminar o módulo de autenticação

Período:
Próxima semana

Data concreta:
Ainda não definida

Projeto:
?

[Confirmar]
[Editar]
[Corrigir por voz]
[Cancelar]
```

Se a data concreta for necessária:

```text
Qual dia da próxima semana devo considerar como prazo?
```

Somente depois da confirmação:

```text
Proposal
    ↓
Domain Command
    ↓
Database
```

---

# 4. Camadas da aplicação

A aplicação será organizada conceitualmente em quatro camadas:

```text
Presentation
     ↓
Application
     ↓
Domain
     ↓
Infrastructure
```

## 4.1 Presentation

Responsável por:

* páginas;
* componentes;
* formulários;
* gravação de áudio;
* reprodução de feedback;
* navegação;
* estados visuais;
* preview;
* confirmação;
* edição;
* dashboard;
* inbox.

Não deve conter regras fundamentais do negócio.

Exemplo incorreto:

```javascript
if (task.deadline < today) {
    task.status = "OVERDUE";
}
```

dentro de um componente React.

A regra deve pertencer ao domínio/aplicação.

---

# 5. Application Layer

A camada Application coordena casos de uso.

Exemplos:

```text
CaptureVoice
CaptureText
TranscribeCapture
InterpretCapture
CreateInterpretationProposal
ConfirmProposal
EditProposal
CorrectProposalByVoice
CancelProposal

CreateTask
CompleteTask
RescheduleTask

CreateProject
UpdateProject
AddProjectDecision
AddProjectProblem

RegisterIncome
RegisterExpense
RegisterDebt
RegisterPayment

GenerateWeeklyReview
GenerateSuggestions
CreateInboxItem

SyncObsidian
```

A camada Application responde:

> "O que o sistema precisa fazer?"

Não responde:

> "Como o PostgreSQL funciona?"

---

# 6. Domain Layer

O Domain contém as regras centrais do sistema.

Principais conceitos:

```text
Capture
Transcription
Interpretation
Task
Commitment
Project
Idea
Problem
Improvement
Responsibility
Goal
FinanceEntry
Budget
FinancialCommitment
InboxItem
Review
Suggestion
Decision
```

O domínio não deve saber se a interface é:

* React;
* PWA;
* Android;
* desktop;
* outra interface futura.

Também não deve saber qual fornecedor de IA está sendo utilizado.

---

# 7. Infrastructure Layer

Responsável pela comunicação com recursos externos.

Exemplos:

```text
PostgreSQL
AI Provider
Transcription Provider
Obsidian Integration
File Storage temporário
Email futuro
Calendar futuro
Notification Provider futuro
```

A infraestrutura implementa interfaces utilizadas pelas camadas superiores.

Exemplo conceitual:

```javascript
class AIService {
    constructor(provider) {
        this.provider = provider;
    }

    async interpret(input) {
        return this.provider.interpret(input);
    }
}
```

A aplicação não precisa saber se o provider é:

```text
OpenAI
Gemini
modelo local
outro fornecedor
```

---

# 8. Estrutura inicial do projeto

A estrutura proposta é:

```text
/
├── app/
│   ├── (dashboard)/
│   │   ├── page.js
│   │   ├── today/
│   │   ├── week/
│   │   ├── inbox/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── finance/
│   │   ├── goals/
│   │   └── reviews/
│   │
│   ├── capture/
│   ├── api/
│   │
│   ├── layout.js
│   └── globals.css
│
├── src/
│   ├── domain/
│   │   ├── capture/
│   │   ├── tasks/
│   │   ├── projects/
│   │   ├── finance/
│   │   ├── goals/
│   │   ├── inbox/
│   │   ├── reviews/
│   │   └── shared/
│   │
│   ├── application/
│   │   ├── capture/
│   │   ├── tasks/
│   │   ├── projects/
│   │   ├── finance/
│   │   ├── suggestions/
│   │   ├── reviews/
│   │   └── inbox/
│   │
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── ai/
│   │   ├── transcription/
│   │   ├── obsidian/
│   │   └── storage/
│   │
│   └── shared/
│       ├── dates/
│       ├── validation/
│       ├── errors/
│       └── utils/
│
├── components/
│   ├── capture/
│   ├── dashboard/
│   ├── tasks/
│   ├── projects/
│   ├── finance/
│   ├── inbox/
│   └── ui/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── prisma/ ou migrations/
│
├── public/
│
├── docs/
│
├── ai/
│
├── package.json
└── next.config.js
```

A estrutura final poderá mudar depois da escolha do ORM/database tooling.

O princípio importante é a separação de responsabilidades, não o nome exato das pastas.

---

# 9. Capture Pipeline

O pipeline de captura é uma das partes centrais do sistema.

```text
User
 │
 ├── Audio
 │
 └── Text
      │
      ▼
Capture Service
      │
      ▼
Transcription
      │
      ▼
Normalization
      │
      ▼
AI Interpretation
      │
      ▼
Structured Proposal
      │
      ▼
Business Validation
      │
      ▼
Preview
      │
      ├── Confirm
      ├── Edit
      ├── Voice Correction
      └── Cancel
      │
      ▼
Domain Command
      │
      ▼
PostgreSQL
```

---

# 10. Capture

Uma captura representa a entrada original do utilizador.

Exemplo:

```text
Capture
├── id
├── userId
├── type
├── createdAt
├── source
├── originalFilename
├── mimeType
├── duration
├── hash
└── metadata
```

Tipos:

```text
VOICE
TEXT
```

Para áudio, o arquivo original não deve ser mantido permanentemente.

O sistema deve preservar apenas os metadados necessários para proveniência/auditoria.

---

# 11. Proveniência

Toda informação importante deve poder responder:

> "De onde veio isto?"

Exemplo:

```text
Task
 ↓
Confirmation
 ↓
Interpretation
 ↓
Transcription
 ↓
Capture
 ↓
originalFilename
```

Isso permite posteriormente responder:

```text
Esta tarefa foi criada a partir de qual captura?
```

ou:

```text
Por que o sistema acredita que esta tarefa existe?
```

---

# 12. Transcription

A transcrição é uma etapa independente da interpretação.

```text
Audio
  ↓
Transcription Provider
  ↓
Transcript
```

O sistema não deve assumir que:

```text
transcrição = significado
```

Exemplo:

```text
Transcrição:
"Tenho que falar com o João sexta"

Interpretação:
Possível compromisso/tarefa.

Data:
Sexta-feira.

Pessoa:
João.

Estado:
Necessita confirmação.
```

---

# 13. AI Interpretation Layer

A IA recebe contexto controlado.

```text
Transcript
+
Relevant Context
+
Business Rules
+
Current Date/Time
+
Existing Entities
        ↓
     AI Model
        ↓
Structured Proposal
```

A IA NÃO deve receber autorização implícita para alterar o banco.

Ela produz uma proposta.

Exemplo:

```json
{
  "intent": "CREATE_TASK",
  "title": "Falar com João",
  "deadline": "2026-10-09",
  "confidence": 0.91,
  "relatedProject": null,
  "missingInformation": []
}
```

---

# 14. Context Resolution

O sistema deve utilizar contexto existente para interpretar referências.

Exemplo:

> "Preciso continuar aquele projeto."

Se houver:

```text
Projeto A
Projeto B
Projeto C
```

não deve escolher arbitrariamente.

Deve perguntar:

```text
Qual projeto?

1. Gestão Académica
2. Personal Second Brain
3. Sistema de Turmas
```

Somente quando houver segurança suficiente a resolução pode ser automática.

---

# 15. Temporal Intelligence

O sistema deve entender linguagem natural temporal.

Exemplos:

```text
hoje
amanhã
sexta
esta semana
próxima semana
fim do mês
segunda metade do mês
próximo mês
daqui a duas semanas
```

Essas expressões devem ser convertidas para estruturas temporais.

Exemplo:

```text
"próxima semana"
        ↓
PeriodExpression
        ↓
2026-10-05 → 2026-10-11
```

Mas:

```text
"algum dia"
```

não deve ser transformado artificialmente numa data.

Se uma regra de negócio exigir data concreta:

```text
"Qual dia pretende?"
```

A interpretação temporal deve considerar:

* timezone do utilizador;
* data atual;
* idioma;
* calendário;
* início/fim da semana;
* feriados futuramente, se necessário.

---

# 16. Homepage

A homepage será o centro de comando.

Não será apenas uma lista de tarefas.

Estrutura conceptual:

```text
HOME
│
├── Capturar
│
├── Hoje
│   ├── tarefas
│   ├── compromissos
│   └── prioridades
│
├── Esta Semana
│   ├── tarefas
│   ├── projetos
│   ├── objetivos
│   └── prazos
│
├── Precisa de Atenção
│
├── Sugestões
│
└── Visão Geral
    ├── projetos
    ├── finanças
    ├── objetivos
    └── progresso
```

A homepage deve responder rapidamente:

> "O que está acontecendo comigo e o que merece minha atenção?"

---

# 17. Action & Decision Inbox

A Inbox não é uma lista de tarefas.

Ela representa:

> "Existe alguma coisa aqui que precisa da minha atenção, decisão ou ação."

Exemplos:

```text
[DECISÃO]
A tarefa X não possui data concreta.

[ATENÇÃO]
Projeto Y está parado há 14 dias.

[SUGESTÃO]
Você possui três tarefas relacionadas que poderiam ser agrupadas.

[AMBIGUIDADE]
"Falar com João" pode estar relacionado a dois projetos.

[FINANCEIRO]
Despesa recorrente aumentou este mês.

[PROBLEMA]
Uma responsabilidade não foi atualizada há 30 dias.
```

A Inbox deve possuir estados:

```text
OPEN
IN_PROGRESS
RESOLVED
DISMISSED
SNOOZED
```

---

# 18. Tasks

Uma Task representa uma ação concreta.

Exemplo conceitual:

```text
Task
├── id
├── title
├── description
├── status
├── priority
├── deadline
├── period
├── projectId
├── context
├── dependencies
├── notes
├── source
├── createdAt
├── updatedAt
└── completedAt
```

Estados possíveis:

```text
PENDING
IN_PROGRESS
COMPLETED
CANCELLED
BLOCKED
```

Uma ideia não deve ser transformada automaticamente em Task.

---

# 19. Ideas

Ideias são entidades próprias.

```text
Idea
├── id
├── title
├── description
├── context
├── projectId?
├── status
├── source
└── createdAt
```

Uma ideia pode permanecer indefinidamente como ideia.

Somente uma ação explícita pode convertê-la em:

```text
Task
```

ou:

```text
Project
```

---

# 20. Projects

Um projeto representa um sistema de trabalho, não apenas uma pasta de tarefas.

```text
Project
├── objective
├── description
├── status
├── progress
├── deadline
├── deliverables
├── stages
├── tasks
├── problems
├── improvements
├── ideas
├── decisions
├── risks
├── notes
├── documents
├── history
└── nextActions
```

O projeto deve permitir responder:

```text
O que é?
Por que existe?
Onde estou?
O que já foi feito?
O que falta?
O que está bloqueando?
Qual é o próximo passo?
Que decisões foram tomadas?
Que problemas apareceram?
Que ideias existem?
```

---

# 21. Finance Domain

Finanças não serão implementadas como uma simples lista de despesas.

Modelo conceptual:

```text
Finance
├── Income
├── Expense
├── Transfer
├── Balance
├── Category
├── Budget
├── Debt
├── Payment
├── RecurringExpense
├── FinancialCommitment
├── FinancialGoal
└── FinancialReport
```

O sistema deverá permitir posteriormente análises como:

```text
Quanto entrou?
Quanto saiu?
Onde estou gastando?
Quanto ainda devo?
Quais pagamentos estão próximos?
Quais despesas são recorrentes?
Estou dentro do orçamento?
Como o comportamento mudou?
```

Valores financeiros devem utilizar tipos adequados para precisão monetária.

Não utilizar `float` JavaScript como fonte de verdade para dinheiro.

---

# 22. Proactive Intelligence

O sistema deverá analisar o estado atual e histórico.

Exemplos:

```text
Projeto parado
        ↓
Suggestion

Tarefa atrasada
        ↓
Attention

Responsabilidade esquecida
        ↓
Suggestion

Despesa recorrente alterada
        ↓
Financial Alert

Objetivo sem progresso
        ↓
Suggestion

Muitos compromissos no mesmo período
        ↓
Planning Warning
```

A sugestão não altera automaticamente o sistema.

Fluxo:

```text
Detection
   ↓
Suggestion
   ↓
Inbox
   ↓
User Decision
```

---

# 23. Automação

A automação será configurável.

Configuração inicial:

```text
AUTOMATION = OFF
```

Exemplo:

```text
Categoria: Tasks
Automação: OFF

Categoria: Obsidian Sync
Automação: ON

Categoria: Finance
Automação: OFF
```

O sistema deve permitir configurações mais específicas futuramente.

Importante:

> Automação técnica não significa autoridade de negócio.

Mesmo quando uma automação está habilitada, regras críticas devem continuar sendo respeitadas.

---

# 24. Database

PostgreSQL será a fonte de verdade.

A base deverá conter, no mínimo, grupos relacionados a:

```text
users
captures
transcriptions
interpretations

tasks
commitments
projects
project_deliverables
project_problems
project_improvements
project_ideas
project_decisions

responsibilities
goals

finance_entries
budgets
debts
payments
financial_commitments

inbox_items
suggestions

reviews
events
audit_log
integrations
automation_settings
```

O modelo definitivo será criado depois da definição detalhada das entidades.

Não criar tabelas apenas porque uma tela precisa delas.

Primeiro:

```text
Domain
 ↓
Use Case
 ↓
Data requirements
 ↓
Database model
```

---

# 25. PostgreSQL e dados flexíveis

O PostgreSQL poderá utilizar `jsonb` onde houver dados realmente variáveis, como determinados metadados de interpretação.

Entretanto:

```text
Não transformar todo o domínio em JSON.
```

Dados importantes e consultados frequentemente devem permanecer estruturados.

Exemplo:

```text
Task.deadline
Task.status
Task.project_id
Task.priority
```

devem ser campos estruturados.

`jsonb` é adequado para dados auxiliares/variáveis quando houver justificativa.

PostgreSQL possui suporte a `jsonb` e índices GIN, permitindo pesquisas eficientes sobre documentos JSON quando esse padrão for realmente necessário.

Também existe suporte nativo para pesquisa textual e `tsvector`, que poderá ser avaliado antes de adicionar um mecanismo de busca externo.

---

# 26. Search

A busca deverá eventualmente procurar em:

```text
Tasks
Projects
Ideas
Notes
Captures
Decisions
Finance
Reviews
```

Primeira abordagem:

```text
PostgreSQL Full-Text Search
```

Somente introduzir Elasticsearch/OpenSearch ou outro mecanismo caso exista uma necessidade técnica comprovada.

Não adicionar infraestrutura prematuramente.

---

# 27. Obsidian Integration

Obsidian será uma projeção do estado confirmado da aplicação.

Exemplo:

```text
PostgreSQL
    ↓
Obsidian Sync Service
    ↓
Markdown
    ↓
Vault
```

Possível estrutura:

```text
Vault/
├── Projects/
├── Tasks/
├── Ideas/
├── Areas/
├── Finance/
├── Goals/
├── Reviews/
└── Daily/
```

A estrutura exata será definida posteriormente.

O sistema deve manter identificadores próprios nos documentos para relacionar Markdown com entidades internas.

Exemplo:

```yaml
---
second_brain_id: project_123
type: project
---
```

Isso evita depender apenas do nome do arquivo.

O Obsidian oferece o protocolo `obsidian://`, incluindo ações para abrir e criar notas, o que poderá ser útil para integração e navegação, mas não será usado como substituto do banco de dados.

---

# 28. Conflitos de sincronização

A sincronização deverá possuir uma estratégia explícita.

Nunca assumir:

```text
Obsidian mudou
→ sobrescrever banco automaticamente
```

Sem uma política de conflito.

Possíveis estados:

```text
SYNCED
LOCAL_CHANGED
REMOTE_CHANGED
CONFLICT
ERROR
```

Futuramente:

```text
Database
      ↕
Synchronization Engine
      ↕
Obsidian
```

poderá suportar sincronização bidirecional controlada.

Na primeira versão, é preferível começar com:

```text
Database → Obsidian
```

porque reduz drasticamente a complexidade.

---

# 29. Next.js

O projeto utilizará:

```text
React
+
Next.js
+
JavaScript
```

sem TypeScript.

O Next.js será utilizado como aplicação full-stack, utilizando principalmente o App Router. A documentação oficial posiciona o App Router como o router moderno do Next.js e descreve o framework como capaz de construir aplicações full-stack.

Server Actions poderão ser utilizadas para determinadas mutações internas, evitando criar endpoints HTTP desnecessários para operações que não precisam ser consumidas externamente.

APIs/Route Handlers continuarão disponíveis quando uma interface HTTP for realmente necessária.

---

# 30. Não criar uma API artificial

Não fazer:

```text
React
 ↓
/api/tasks
 ↓
Service
 ↓
Database
```

para absolutamente tudo apenas porque "é uma API".

Se a operação for exclusivamente interna à aplicação Next.js, poderá utilizar diretamente a camada Application através de Server Actions/server-side code.

Se a operação precisar ser consumida por:

```text
mobile app futuro
integração externa
webhook
outro serviço
```

então uma API formal será apropriada.

---

# 31. AI Provider Abstraction

A arquitetura não deve depender diretamente de um único fornecedor.

```text
Application
     ↓
AI Service
     ↓
AI Provider Interface
     ↓
┌─────────────┬─────────────┬──────────────┐
│ Provider A  │ Provider B  │ Local Model  │
└─────────────┴─────────────┴──────────────┘
```

Isso permite trocar modelos sem alterar o domínio.

A mesma abstração deverá existir para transcrição:

```text
Transcription Service
        ↓
Transcription Provider
```

---

# 32. AI Output Validation

Nunca confiar diretamente no JSON produzido pelo modelo.

Fluxo:

```text
AI Output
   ↓
Schema Validation
   ↓
Business Validation
   ↓
Proposal
```

Por exemplo:

```text
AI:
deadline = "next Friday"
```

não deve entrar diretamente na base.

Primeiro:

```text
Temporal Parser
↓
2026-10-09
↓
Validation
↓
Proposal
```

Se houver ambiguidade:

```text
missingInformation
```

deve ser produzido.

---

# 33. Security

Mesmo sendo inicialmente um sistema pessoal, a arquitetura deve considerar:

```text
Authentication
Authorization
Session Security
CSRF protection
Input validation
Rate limiting
Secrets management
Database access control
Audit trail
Encryption in transit
Secure file handling
```

A implementação de multiutilizador não deve ser necessária agora, mas as entidades deverão possuir uma relação clara com o proprietário dos dados.

Exemplo:

```text
user_id
```

nas entidades que representam dados pessoais.

---

# 34. Multi-user Future

Não implementar multi-tenancy complexo prematuramente.

Mas evitar arquiteturas que tornem isso impossível.

Evolução possível:

```text
Current:

User
 └── Personal Data


Future:

Organization
 ├── User
 ├── User
 └── Shared Resources
```

O domínio deve evitar assumir que existe apenas um utilizador em todo o código.

---

# 35. Background Processing

Algumas operações não devem bloquear a interface:

```text
Transcription
AI interpretation
Weekly analysis
Obsidian synchronization
Large reports
Suggestion generation
```

Inicialmente poderão ser executadas de maneira simples.

À medida que o volume justificar:

```text
Application
    ↓
Job
    ↓
Worker
    ↓
Result
```

Um sistema de filas só deverá ser introduzido quando houver necessidade real.

---

# 36. Event / Audit Model

Alterações importantes deverão possuir histórico.

Exemplo:

```text
Task created
Task deadline changed
Task completed
Project status changed
Finance entry created
Idea converted to project
Suggestion accepted
Suggestion dismissed
```

Isso permite responder:

> "O que mudou?"

e:

> "Por que o estado atual é este?"

---

# 37. Observability

O sistema deverá possuir logs estruturados.

Eventos importantes:

```text
capture.created
transcription.completed
interpretation.created
proposal.confirmed
proposal.cancelled

task.created
task.completed

project.updated

finance.entry.created

suggestion.created
suggestion.accepted

obsidian.sync.completed
obsidian.sync.failed
```

Nunca registrar:

* senhas;
* tokens;
* chaves API;
* informações sensíveis desnecessárias;
* áudio original.

---

# 38. Testing Strategy

A arquitetura deve ser testável sem depender sempre da interface.

## Unit

Testar:

```text
Date normalization
Task rules
Project rules
Finance calculations
Suggestion rules
Proposal validation
Context resolution
```

## Integration

Testar:

```text
Application → PostgreSQL
Application → AI adapter
Application → transcription adapter
Application → Obsidian adapter
```

## E2E

Testar fluxos reais:

```text
Record audio
 ↓
Transcribe
 ↓
Interpret
 ↓
Confirm
 ↓
Task created
```

Outro:

```text
Idea captured
 ↓
Idea remains idea
```

Outro:

```text
Task without concrete date
 ↓
System asks
```

Outro:

```text
Project ambiguity
 ↓
System asks user
```

---

# 39. Mobile-first

O sistema será projetado primeiro para smartphone.

A principal ação deve estar sempre acessível:

```text
┌──────────────────────────┐
│       PERSONAL BRAIN     │
│                          │
│  Hoje                    │
│                          │
│  ...                     │
│                          │
│                          │
│                          │
│              🎙 CAPTURAR │
└──────────────────────────┘
```

O objetivo é:

```text
Abrir
 ↓
Falar
 ↓
Confirmar
```

com o mínimo de navegação possível.

A interface desktop será uma adaptação, não o contrário.

---

# 40. PWA

A aplicação deverá ser preparada para funcionar como PWA.

Objetivos:

* instalação no smartphone;
* experiência semelhante a aplicação nativa;
* acesso rápido;
* interface responsiva;
* suporte a funcionalidades offline quando tecnicamente justificável.

Offline completo não deve ser prometido na primeira versão.

Primeiro deve ser avaliado quais partes realmente precisam funcionar offline.

---

# 41. Estados de rede

Como o uso será predominantemente móvel, a aplicação deve considerar:

```text
ONLINE
SLOW_CONNECTION
OFFLINE
RECONNECTING
```

Uma captura iniciada durante uma conexão ruim não deve simplesmente desaparecer.

Futuramente poderá existir:

```text
Local Capture Queue
       ↓
Connection Restored
       ↓
Server Synchronization
```

Isso deverá ser introduzido quando a necessidade for validada.

---

# 42. Dashboard data flow

A homepage não deve consultar cada tabela de forma indiscriminada.

Deve existir uma camada de composição:

```text
Dashboard Service
       │
       ├── Today
       ├── Week
       ├── Inbox
       ├── Projects
       ├── Goals
       ├── Finance
       └── Suggestions
```

Resultado:

```text
DashboardViewModel
```

Isso evita transformar o componente React em um agregador de regras de negócio.

---

# 43. Weekly Review

A revisão semanal será uma funcionalidade de primeira classe.

Entrada:

```text
Tasks
Projects
Goals
Responsibilities
Finance
Events
Suggestions
History
```

Saída:

```text
What happened
What was completed
What remains
What is overdue
Project progress
Financial overview
Goals progress
Problems
Patterns
Suggestions
Next week
```

O relatório gerado pela IA deverá distinguir claramente:

```text
FACT
OBSERVATION
INTERPRETATION
SUGGESTION
```

para evitar que uma inferência seja apresentada como fato.

---

# 44. Decision authority

Regra fundamental:

```text
AI can suggest.
User decides.
Application executes confirmed commands.
```

Exemplo:

```text
AI:
"Talvez devesses adiar esta tarefa."

Não:

"Task deadline changed."
```

A segunda ação exige autorização conforme a configuração de automação.

---

# 45. Technical Decision Process

Sempre que surgir uma decisão técnica relevante:

```text
Problem
   ↓
Constraints
   ↓
Alternatives
   ↓
Evaluation
   ↓
Decision
   ↓
Consequences
```

Exemplo:

```text
Problema:
Precisamos de ORM.

Alternativas:
Prisma
Drizzle
SQL direto
Outro

Avaliação:
- compatibilidade JS
- PostgreSQL
- migrations
- produtividade
- performance
- complexidade
- maturidade
- manutenção

Decisão:
X

Consequências:
Y
```

A escolha não deve ser feita apenas por popularidade.

---

# 46. Bibliotecas e serviços

Nenhuma biblioteca adicional deve ser adicionada apenas porque é popular.

Para cada dependência relevante:

```text
Why?
What problem does it solve?
What alternatives exist?
What does it cost?
Does it lock the architecture?
Can we replace it?
```

Dependências devem ser justificadas.

---

# 47. Primeira versão técnica

A primeira versão deve evitar microserviços.

Arquitetura inicial:

```text
Next.js Application
        │
        ├── Domain
        ├── Application
        ├── Infrastructure
        │
        └── PostgreSQL
```

Com adapters externos:

```text
AI
Transcription
Obsidian
```

Isso é um:

```text
Modular Monolith
```

e é a escolha arquitetural inicial recomendada.

Não precisamos distribuir o sistema em vários serviços antes de existir uma necessidade real.

---

# 48. Evolução futura

A arquitetura permite posteriormente:

```text
                    ┌───────────────┐
                    │ Web / PWA     │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ Application   │
                    │ Core          │
                    └───────┬───────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
     PostgreSQL          AI Layer        Integrations
                                             │
                                ┌────────────┼────────────┐
                                ▼            ▼            ▼
                            Obsidian      Calendar     Future Apps
```

Se posteriormente houver necessidade real de separar componentes:

```text
Capture Service
AI Service
Suggestion Engine
Notification Service
Sync Service
```

poderão ser extraídos do monólito.

Mas a extração será consequência de uma necessidade, não objetivo inicial.

---

# 49. Ordem de implementação

A implementação não deve começar por todas as telas.

Ordem recomendada:

```text
1. Domain model
        ↓
2. Database
        ↓
3. Capture
        ↓
4. Transcription abstraction
        ↓
5. AI interpretation
        ↓
6. Proposal/confirmation
        ↓
7. Tasks
        ↓
8. Projects
        ↓
9. Inbox
        ↓
10. Homepage
        ↓
11. Finance
        ↓
12. Suggestions
        ↓
13. Reviews
        ↓
14. Obsidian projection
        ↓
15. PWA improvements
        ↓
16. Advanced automation
```

---

# 50. Primeiro vertical slice

Antes de implementar todo o sistema, deve existir um fluxo completo funcionando:

```text
Usuário
  ↓
Grava áudio
  ↓
Upload
  ↓
Transcrição
  ↓
Interpretação
  ↓
Proposal
  ↓
Preview
  ↓
Usuário confirma
  ↓
Task
  ↓
PostgreSQL
  ↓
Homepage
```

Esse vertical slice validará a arquitetura principal.

Só depois devemos expandir para:

```text
Project
Finance
Ideas
Inbox
Suggestions
Reviews
Obsidian
```

---

# 51. Definition of Done

Uma funcionalidade não será considerada concluída apenas porque "funciona na tela".

Deve possuir:

```text
Domain rule
Application use case
Validation
Persistence
Error handling
Tests
UI
Loading state
Empty state
Failure state
Security consideration
Audit/provenance when relevant
Documentation
```

---

# 52. Regras arquiteturais não negociáveis

## Regra 1

Não inventar regra de negócio.

## Regra 2

Não tratar interpretação da IA como fato confirmado.

## Regra 3

Não criar projeto automaticamente a partir de ideia.

## Regra 4

Não inventar datas.

## Regra 5

Não inventar valores financeiros.

## Regra 6

Não escolher arbitrariamente entre entidades quando houver ambiguidade.

## Regra 7

Não colocar lógica de negócio importante dentro de componentes React.

## Regra 8

Não fazer Obsidian ser requisito para o sistema funcionar.

## Regra 9

Não acoplar o domínio a um fornecedor de IA.

## Regra 10

Não introduzir tecnologia adicional sem justificar sua necessidade.

## Regra 11

Automação deve estar desligada por padrão.

## Regra 12

Mudanças significativas devem possuir autorização apropriada.

## Regra 13

Informações importantes devem preservar sua proveniência.

## Regra 14

O sistema deve conseguir explicar por que uma sugestão ou interpretação foi produzida.

## Regra 15

A arquitetura deve permitir crescimento sem transformar o código num conjunto de CRUDs independentes.

---

# 53. Estado arquitetural atual

A arquitetura aprovada neste estágio é:

```text
React
  +
Next.js
  +
JavaScript
  +
PostgreSQL
  +
Modular Monolith
  +
AI Adapter
  +
Transcription Adapter
  +
Obsidian Projection
```

Ainda NÃO estão definitivamente escolhidos:

```text
ORM
Validation library
AI provider
Transcription provider
Authentication provider
UI library
PWA strategy
Background job technology
Obsidian sync mechanism
Deployment platform
```

Essas escolhas devem ser avaliadas separadamente.

---

# 54. Próxima decisão técnica

A próxima etapa deve ser uma análise comparativa das tecnologias que vão sustentar a implementação.

Especialmente:

```text
1. ORM / Database access
   Prisma vs Drizzle vs SQL

2. Validation
   Zod vs alternativas

3. AI
   Provider abstraction
   OpenAI
   Gemini
   Local models
   etc.

4. Transcription
   Cloud vs local

5. Authentication
   Necessidade atual vs preparação futura

6. Background jobs
   Necessidade inicial vs futura

7. Obsidian integration
   Projection strategy

8. PWA/offline
   O que realmente precisa funcionar offline

9. Deployment
   Local development
   VPS
   Cloud
```

A decisão final deve ser documentada antes da implementação.

---

# 55. Princípio final

O Personal Second Brain não deve ser construído como:

```text
uma aplicação de tarefas
+ uma aplicação de finanças
+ uma aplicação de notas
+ uma aplicação de projetos
```

ligadas artificialmente.

Deve ser construído como:

```text
              PERSONAL CONTEXT
                    │
          ┌─────────┴─────────┐
          │                   │
       CAPTURE             HISTORY
          │                   │
          ▼                   │
    INTERPRETATION             │
          │                   │
          ▼                   │
     CONFIRMATION              │
          │                   │
          ▼                   │
       DOMAIN ◄───────────────┘
          │
    ┌─────┼─────┬────────┬────────┐
    ▼     ▼     ▼        ▼        ▼
 Tasks Projects Finance Goals Responsibilities
    │     │     │        │        │
    └─────┴─────┴────────┴────────┘
                    │
                    ▼
              SYSTEM ANALYSIS
                    │
                    ▼
               SUGGESTIONS
                    │
                    ▼
              ACTION / DECISION
                    │
                    ▼
                  USER
```

O verdadeiro núcleo do produto é:

> **um sistema que mantém o contexto da vida e do trabalho do utilizador, entende novas informações, relaciona-as com o que já existe, acompanha o estado ao longo do tempo e ajuda o utilizador a decidir o que fazer — sem retirar dele a autoridade sobre as próprias decisões.**
