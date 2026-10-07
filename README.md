# J-A-R-V-I-S
> Personal Second Brain: um sistema pessoal inteligente para organizar tarefas, projetos, objetivos, responsabilidades, ideias e finanças através de voz e texto, usando IA para interpretar, contextualizar, analisar e sugerir ações, mantendo o utilizador no controlo.
# Personal Second Brain 🧠

> Um sistema pessoal de gestão de conhecimento, tarefas, projetos, objetivos, responsabilidades e finanças, controlado principalmente por **voz e linguagem natural**.

O **Personal Second Brain** é uma aplicação pessoal inspirada no conceito de *Second Brain*, criada para transformar pensamentos, informações, compromissos e responsabilidades do dia a dia em uma estrutura organizada e acompanhável.

Em vez de depender de escrever manualmente cada informação, o utilizador pode simplesmente **falar ou escrever o que está a pensar**. O sistema interpreta essa informação, apresenta o que entendeu e permite que o utilizador confirme, corrija ou rejeite antes de alterar os dados.

O objetivo não é apenas armazenar informação.

O sistema deve ajudar o utilizador a **entender o seu próprio contexto, acompanhar o que está a acontecer e identificar o que precisa da sua atenção**.

---

## 🎯 Objetivo

O projeto procura resolver um problema comum:

> Temos ideias, tarefas, compromissos, projetos, problemas, objetivos, responsabilidades e informações espalhadas por diferentes lugares, mas não temos uma visão única de como tudo isso se relaciona.

O Personal Second Brain pretende centralizar essa informação e criar um ciclo contínuo:

```text
Capturar
   ↓
Entender
   ↓
Confirmar
   ↓
Organizar
   ↓
Acompanhar
   ↓
Analisar
   ↓
Sugerir
   ↓
Agir
   ↓
Capturar novamente
```

---

## ✨ Principais funcionalidades

### 🎙️ Captura por voz

O utilizador pode gravar uma mensagem como:

> "Preciso terminar o módulo de autenticação até sexta-feira."

O sistema:

1. recebe o áudio;
2. faz a transcrição;
3. interpreta o conteúdo;
4. identifica possíveis entidades;
5. apresenta uma proposta estruturada;
6. permite correção;
7. solicita confirmação;
8. só depois grava a alteração.

O áudio original **não é mantido permanentemente** como parte da memória principal do sistema.

São preservados apenas metadados necessários para proveniência e auditoria, como:

* identificador da captura;
* nome original;
* MIME type;
* duração;
* timestamp;
* hash;
* referência da transcrição.

---

### 📝 Entrada por texto

O mesmo processo pode ser utilizado com texto.

Exemplo:

```text
Tenho uma ideia de criar uma integração com WhatsApp
para receber notificações dos meus projetos.
```

O sistema pode identificar:

```text
Tipo: IDEIA
Tema: Integração com WhatsApp
```

Mas **não transforma automaticamente a ideia em projeto ou tarefa**.

---

### 🤖 Interpretação com IA

A IA funciona como uma camada de interpretação e raciocínio.

Ela pode:

* interpretar linguagem natural;
* identificar intenções;
* classificar informações;
* relacionar informações com entidades existentes;
* identificar problemas;
* analisar projetos;
* detectar informações em falta;
* sugerir próximas ações;
* encontrar padrões;
* gerar revisões;
* fazer perguntas quando existe ambiguidade.

A IA, entretanto, **não possui autoridade para alterar silenciosamente o estado do sistema**.

---

### ✅ Confirmação humana

Antes de uma alteração significativa, o sistema apresenta uma proposta.

Exemplo:

```text
Entendi que pretende criar:

Tarefa
──────────────
Título:
Terminar módulo de autenticação

Projeto:
Gestão Académica

Prazo:
06/10/2026

Deseja confirmar?
```

O utilizador pode:

```text
Confirmar
Editar
Corrigir por voz
Cancelar
```

Isto mantém o utilizador como autoridade final sobre os seus próprios dados.

---

## 📂 O que o sistema organiza

O Personal Second Brain não é apenas um *to-do list*.

Ele organiza diferentes tipos de informação.

### Tasks

Coisas que precisam ser executadas.

```text
"Configurar autenticação do projeto."
```

### Commitments

Compromissos assumidos pelo utilizador.

```text
"Tenho de entregar o relatório na sexta-feira."
```

### Projects

Conjuntos de trabalho relacionados a um objetivo.

Um projeto pode possuir:

* objetivo;
* estado;
* progresso;
* entregáveis;
* tarefas;
* problemas;
* melhorias;
* ideias;
* decisões;
* prazos;
* histórico;
* próximas ações.

### Ideas

Pensamentos ou possibilidades futuras.

Uma ideia **não se transforma automaticamente em tarefa ou projeto**.

### Goals

Objetivos que representam uma direção ou resultado que o utilizador pretende alcançar.

### Responsibilities

Responsabilidades recorrentes ou áreas que precisam de acompanhamento.

### Problems

Problemas identificados dentro ou fora dos projetos.

### Improvements

Possibilidades de melhoria identificadas pelo utilizador ou pelo sistema.

### Decisions

Decisões importantes e o respetivo contexto.

### Finance

Gestão financeira pessoal, incluindo:

* receitas;
* despesas;
* saldo;
* categorias;
* orçamentos;
* dívidas;
* pagamentos;
* compromissos financeiros;
* despesas recorrentes;
* objetivos financeiros;
* histórico;
* relatórios.

### Inbox

A **Action & Decision Inbox** funciona como uma caixa central de coisas que precisam da atenção do utilizador.

Ela não é simplesmente uma lista de tarefas.

Por exemplo:

```text
Task:
"Enviar relatório."

Inbox:
"Existe uma decisão pendente sobre qual tecnologia utilizar
no módulo de notificações."
```

---

# 🧠 Inteligência Proativa

O sistema não deve esperar sempre que o utilizador pergunte alguma coisa.

A partir dos dados confirmados, pode identificar situações como:

* tarefas atrasadas;
* projetos parados;
* projetos sem próxima ação;
* objetivos negligenciados;
* responsabilidades esquecidas;
* informações inconsistentes;
* períodos excessivamente carregados;
* problemas recorrentes;
* padrões financeiros;
* compromissos próximos;
* oportunidades de melhoria;
* decisões pendentes.

Essas situações são apresentadas como **sugestões**, não como alterações automáticas.

Exemplo:

```text
💡 Sugestão

O projeto "Sistema Académico" não apresenta
uma nova ação há 12 dias.

Pode ser necessário definir a próxima ação.
```

---

# 📅 Visão temporal

A aplicação fornece uma visão do estado pessoal em diferentes horizontes.

### Hoje

O que precisa de atenção agora.

### Semana

Visão das próximas atividades e compromissos.

### Histórico

O que já aconteceu.

### Futuro

Projetos, objetivos, tarefas e compromissos futuros.

### Balance

Uma visão geral do estado do sistema:

* projetos;
* tarefas;
* objetivos;
* responsabilidades;
* finanças;
* problemas;
* decisões;
* pendências.

---

# 🔄 Revisões

O sistema pode produzir revisões periódicas.

Uma revisão semanal pode apresentar:

```text
Semana
──────────────

Concluído
• ...

Pendente
• ...

Atrasado
• ...

Projetos
• ...

Objetivos
• ...

Finanças
• ...

Problemas encontrados
• ...

Padrões observados
• ...

Sugestões
• ...
```

As revisões distinguem entre:

* fatos;
* observações;
* interpretações;
* sugestões.

---

# 🏗️ Arquitetura

O projeto utiliza uma arquitetura modular organizada em camadas:

```text
Presentation
      ↓
Application
      ↓
Domain
      ↓
Infrastructure
```

A visão geral do sistema:

```text
                 MOBILE / WEB
                      │
                      ▼
                 React / Next.js
                      │
                      ▼
                Application Layer
                      │
             ┌────────┴────────┐
             ▼                 ▼
        Domain Layer       AI Layer
             │                 │
             └────────┬────────┘
                      ▼
                 PostgreSQL
               SOURCE OF TRUTH
                      │
                      ▼
             Integration Layer
                      │
                      ▼
                   Obsidian
```

---

# 🗄️ Source of Truth

O **PostgreSQL é a fonte oficial dos dados da aplicação**.

O Obsidian não é utilizado como banco de dados principal.

A relação é:

```text
PostgreSQL
     │
     │ projeção
     ▼
  Obsidian
```

Isso permite que o sistema continue funcionando mesmo sem o Obsidian.

O Obsidian funciona como uma **projeção de conhecimento**, permitindo visualizar e trabalhar com determinados dados em Markdown.

---

# 🤖 IA e regras determinísticas

O sistema separa duas responsabilidades.

```text
                 Personal Second Brain
                         │
             ┌───────────┴───────────┐
             │                       │
             ▼                       ▼
        Rule Engine              AI Engine
             │                       │
       Regras exatas             Interpretação
       Validação                  Contexto
       Permissões                 Análise
       Cálculos                   Sugestões
       Transações                 Linguagem
       Estados                    Raciocínio
```

### Rule Engine

Responsável por aquilo que precisa ser determinístico:

* validação;
* permissões;
* IDs;
* transações;
* integridade dos dados;
* cálculos financeiros;
* regras de negócio;
* mudanças de estado.

### AI Engine

Responsável por:

* interpretar linguagem;
* classificar;
* relacionar contexto;
* resumir;
* analisar;
* detectar padrões;
* sugerir;
* fazer perguntas.

A IA **não escreve diretamente na base de dados**.

---

# 🔐 Princípio de autoridade

O sistema segue uma regra fundamental:

> **A IA pode propor. O sistema pode validar. O utilizador confirma.**

Fluxo:

```text
Input
  ↓
AI Interpretation
  ↓
Proposal
  ↓
Business Validation
  ↓
Preview
  ↓
User Confirmation
  ↓
Domain Command
  ↓
PostgreSQL
```

A confiança da IA não equivale a autorização.

---

# ⏱️ Datas e linguagem natural

O sistema deve compreender expressões temporais naturais como:

```text
amanhã
sexta-feira
na próxima semana
no próximo mês
na segunda metade do mês
daqui a duas semanas
```

Quando a expressão puder ser determinada de forma inequívoca, ela é normalizada para uma data concreta.

Quando houver ambiguidade, o sistema pergunta.

Exemplo:

```text
Utilizador:
"Terminar isso na próxima semana."

Sistema:
"Tenho dois projetos com uma tarefa semelhante.
A qual projeto se refere?"
```

O sistema **não deve inventar datas**.

---

# 🔎 Context Engine

A IA não recebe toda a base de dados a cada interação.

Existe uma camada de contexto:

```text
User Input
    ↓
Context Engine
    ├── Estado atual
    ├── Entidades relevantes
    └── Histórico relevante
    ↓
AI
```

A prioridade do contexto é:

```text
Input atual do utilizador
        ↓
Instruções explícitas
        ↓
Estado confirmado da aplicação
        ↓
Histórico
        ↓
Inferência da IA
```

Isto reduz alucinações e mantém o contexto relevante.

---

# 📱 Mobile-first

O sistema foi pensado principalmente para utilização através do telefone.

A captura deve exigir o menor número possível de passos.

Exemplo:

```text
Abrir aplicação
      ↓
Pressionar gravar
      ↓
Falar
      ↓
Parar
      ↓
Ver interpretação
      ↓
Confirmar
```

A aplicação também deverá funcionar como PWA, permitindo uma experiência próxima de uma aplicação móvel.

---

# 🛠️ Stack tecnológica

### Frontend / Application

* React
* Next.js
* JavaScript

### Backend / Domain

* Next.js
* arquitetura modular
* separação entre domínio, aplicação e infraestrutura

### Database

* PostgreSQL

### AI

A aplicação utiliza uma camada de abstração para que o fornecedor de IA possa ser substituído sem alterar o domínio da aplicação.

### Speech-to-Text

A transcrição também utiliza uma abstração de provider.

### Knowledge Integration

* Obsidian
* Markdown

---

# 📁 Estrutura do projeto

A estrutura principal segue aproximadamente:

```text
.
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
│   ├── layout.js
│   └── globals.css
│
├── src/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── shared/
│
├── components/
├── tests/
├── prisma/
├── docs/
├── ai/
├── public/
├── package.json
└── next.config.js
```

Os detalhes da arquitetura encontram-se na documentação dentro de `docs/`.

---

# 🚀 Como executar

## 1. Pré-requisitos

Instale:

* Node.js
* npm
* PostgreSQL
* Git

Verifique:

```bash
node --version
npm --version
psql --version
git --version
```

---

## 2. Clonar o repositório

```bash
git clone <REPOSITORY_URL>
cd <PROJECT_DIRECTORY>
```

---

## 3. Instalar dependências

```bash
npm install
```

---

## 4. Configurar variáveis de ambiente

Crie um ficheiro:

```text
.env.local
```

Exemplo:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/personal_second_brain"

AI_PROVIDER=""
AI_API_KEY=""

TRANSCRIPTION_PROVIDER=""
TRANSCRIPTION_API_KEY=""
```

> Nunca coloque chaves privadas diretamente no código ou no Git.

---

## 5. Configurar PostgreSQL

Crie uma base de dados:

```sql
CREATE DATABASE personal_second_brain;
```

Depois execute as migrations definidas pelo projeto.

Por exemplo, caso o projeto utilize Prisma:

```bash
npx prisma migrate dev
```

Os comandos exatos podem variar conforme a infraestrutura de persistência utilizada no projeto.

---

## 6. Executar em desenvolvimento

```bash
npm run dev
```

Depois abra:

```text
http://localhost:3000
```

---

# 🎙️ Primeiro fluxo de utilização

Depois de executar a aplicação, o fluxo principal esperado é:

```text
1. Criar uma captura
        ↓
2. Gravar áudio ou inserir texto
        ↓
3. Transcrever
        ↓
4. Interpretar
        ↓
5. Rever proposta
        ↓
6. Corrigir se necessário
        ↓
7. Confirmar
        ↓
8. Guardar no PostgreSQL
        ↓
9. Acompanhar no dashboard
```

Exemplo:

```text
"Preciso estudar PostgreSQL amanhã
durante duas horas."
```

A aplicação poderá apresentar:

```text
Tipo:
TASK

Título:
Estudar PostgreSQL

Data:
03/10/2026

Duração:
2 horas
```

O utilizador confirma antes da criação.

---

# 🔒 Segurança e integridade

O projeto segue alguns princípios:

* não confiar na IA para autorização;
* validar dados no servidor;
* não expor secrets no frontend;
* utilizar queries parametrizadas/ORM;
* manter auditoria das alterações importantes;
* validar todos os outputs da IA;
* não permitir SQL arbitrário pela IA;
* não permitir acesso irrestrito da IA ao filesystem;
* separar autenticação de autorização;
* respeitar permissões;
* evitar alterações destrutivas automáticas.

---

# 🧪 Testes

O projeto deve possuir testes para diferentes níveis:

```text
Unit Tests
    ↓
Domain Tests
    ↓
Application Tests
    ↓
Integration Tests
    ↓
API Tests
    ↓
End-to-End Tests
```

Especial atenção deve ser dada a:

* regras de negócio;
* datas;
* finanças;
* transições de estado;
* interpretação da IA;
* confirmação;
* permissões;
* sincronização com Obsidian.

---

# 📚 Documentação

A documentação está organizada por responsabilidade.

```text
README.md
    │
    ├── docs/
    │   ├── PRODUCT.md
    │   └── ARCHITECTURE.md
    │
    └── ai/
        ├── MASTER-PROMPT.md
        ├── SYSTEM-PROMPT.md
        ├── AI-CONTRACT.md
        ├── OUTPUT-SCHEMAS.md
        └── TOOL-CONTRACTS.md
```

### `README.md`

Visão geral e utilização do projeto.

### `docs/PRODUCT.md`

Define o produto, comportamento e regras de negócio.

### `docs/ARCHITECTURE.md`

Define a arquitetura técnica e as decisões estruturais.

### `ai/MASTER-PROMPT.md`

Define o comportamento esperado do agente de desenvolvimento.

### `ai/SYSTEM-PROMPT.md`

Define o comportamento da IA dentro do produto.

### `ai/AI-CONTRACT.md`

Define a separação de responsabilidades entre IA e aplicação.

### `ai/OUTPUT-SCHEMAS.md`

Define os formatos estruturados esperados das respostas da IA.

### `ai/TOOL-CONTRACTS.md`

Define as ferramentas controladas que a IA pode utilizar.

---

# 🧭 Princípios do projeto

O desenvolvimento segue alguns princípios fundamentais:

### 1. Human-in-the-loop

Alterações importantes precisam da confirmação do utilizador.

### 2. Database First

O PostgreSQL é a fonte oficial da verdade.

### 3. AI Decoupling

A aplicação não deve depender de um fornecedor específico de IA.

### 4. Provenance

O sistema deve conseguir responder:

```text
De onde veio esta informação?
Quando foi capturada?
Como foi interpretada?
Quando foi confirmada?
```

### 5. No silent mutation

A IA não deve modificar silenciosamente informações importantes.

### 6. Ideas ≠ Tasks

Uma ideia não é automaticamente uma ação.

### 7. Automation OFF by default

Automação significativa precisa ser explicitamente configurada.

### 8. Context over volume

A IA deve receber contexto relevante, e não simplesmente toda a base de dados.

### 9. Deterministic rules where possible

Tudo aquilo que pode ser resolvido deterministicamente deve ser tratado por regras de software, e não deixado para decisão probabilística da IA.

### 10. Evolução incremental

O sistema deve ser construído através de *vertical slices* funcionais.

---

# 🗺️ Roadmap inicial

```text
[x] Project setup
[x] Arquitetura base
[x] PostgreSQL
[x] Domain model
[x] Application layer
[x] AI abstraction
[x] Transcription abstraction
[x] Audio/Text Capture
[x] Interpretation
[x] Proposal system
[x] Confirmation flow
[x] Tasks
[~] Projects
[~] Action & Decision Inbox
[x] Dashboard
[~] Finance
[ ] Goals
[ ] Responsibilities
[~] Proactive intelligence
[ ] Weekly reviews
[ ] Obsidian projection
[~] PWA
[x] Testing
[ ] Production deployment
```

Legenda: `[x]` concluído · `[~]` parcial · `[ ]` por iniciar.

O detalhe do que está realmente implementado, o que **não** está, e as
decisões técnicas encontram-se em **[`docs/IMPLEMENTATION-NOTES.md`](docs/IMPLEMENTATION-NOTES.md)**.

### Executar o projeto

```bash
npm install
npm run migrate     # cria/atualiza o PostgreSQL
npm run dev         # http://localhost:3000
npm test            # testes unitários e de integração
```

Fluxo completo já funcional:

```text
Escrever ou gravar → interpretar → prévia → confirmar → PostgreSQL → homepage
```

O desenvolvimento deve começar por uma primeira **vertical slice**:

```text
Capture
   ↓
Transcription
   ↓
Interpretation
   ↓
Proposal
   ↓
Confirmation
   ↓
Task
   ↓
PostgreSQL
   ↓
Dashboard
```

Depois disso, as restantes capacidades são adicionadas progressivamente.

---

# 🤝 Desenvolvimento

Este projeto foi concebido para ser desenvolvido com assistência de agentes de programação, mas o agente deve respeitar os contratos e documentação existentes.

Antes de implementar uma funcionalidade, deve:

```text
Entender
   ↓
Projetar
   ↓
Implementar
   ↓
Testar
   ↓
Rever
   ↓
Corrigir
   ↓
Documentar
```

Decisões técnicas podem ser tomadas com base em critérios de engenharia, mas alterações significativas na arquitetura ou nas regras de negócio devem ser explicitadas.

---

# 📌 Estado do projeto

> **Status: Primeiro vertical slice implementado**

A fundação e o primeiro fluxo completo estão implementados e testados:

```text
Captura → Transcrição → Interpretação → Proposta → Confirmação → PostgreSQL → Homepage
```

A arquitetura segue o que está definido em `docs/ARCHITECTURE.md`:
`Presentation → Application → Domain → Infrastructure`, com abstração de
fornecedor de IA e de transcrição, PostgreSQL como fonte de verdade e
confirmação humana obrigatória antes de qualquer escrita.

O que ainda **não** existe (revisões semanais, finanças completas, projeção
para Obsidian, modo offline) está explicitamente registado em
[`docs/IMPLEMENTATION-NOTES.md`](docs/IMPLEMENTATION-NOTES.md). Nenhuma
funcionalidade fictícia foi criada para preencher ecrãs.

---

# 📄 Licença

A licença do projeto será definida conforme a estratégia de distribuição escolhida.
