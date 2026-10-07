# START PROJECT

Leia primeiro todos os documentos existentes em:

* `/README.md`
* `/docs/`
* `/ai/`

Não comece a programar imediatamente.

Primeiro compreenda completamente:

1. o objetivo do produto;
2. os requisitos funcionais;
3. as regras de negócio;
4. a arquitetura;
5. o contrato da IA;
6. os schemas;
7. as políticas de incerteza;
8. as regras de automação;
9. o modelo de contexto;
10. a estratégia de proveniência.

Depois:

1. identifique inconsistências ou informações tecnicamente insuficientes;
2. diferencie dúvidas de negócio de decisões técnicas;
3. não invente regras de negócio;
4. decisões técnicas podem ser tomadas autonomamente quando justificadas;
5. quando uma decisão técnica puder alterar significativamente a arquitetura, apresente a decisão e sua justificativa antes de implementá-la.

Em seguida, construa o sistema progressivamente.

Comece pela fundação:

```text
Project setup
↓
Architecture
↓
Database
↓
Domain model
↓
Application layer
↓
AI abstraction
↓
Capture pipeline
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
Project
↓
Inbox
↓
Dashboard
↓
Finance
↓
Suggestions
↓
Reviews
↓
Obsidian
↓
PWA
```

Não implemente funcionalidades fictícias apenas para preencher telas.

Não crie dados falsos como substituição permanente de funcionalidades reais.

Não trate uma implementação parcial como concluída.

Para cada etapa:

```text
UNDERSTAND
↓
DESIGN
↓
IMPLEMENT
↓
TEST
↓
REVIEW
↓
FIX
↓
DOCUMENT
↓
CONTINUE
```

Sempre preserve:

* JavaScript;
* React;
* Next.js;
* PostgreSQL;
* modular monolith;
* separação Domain/Application/Infrastructure/Presentation;
* AI provider abstraction;
* transcription abstraction;
* PostgreSQL como source of truth;
* Obsidian como integração;
* human confirmation;
* provenance;
* configurable automation;
* testability;
* scalability.

Nunca:

* invente regras;
* invente datas;
* invente valores financeiros;
* invente IDs;
* crie projetos automaticamente a partir de ideias;
* permita que a IA escreva diretamente no banco;
* coloque SQL diretamente no modelo de IA;
* coloque regras de negócio importantes em componentes React;
* acople o domínio a um único fornecedor de IA;
* introduza TypeScript;
* introduza tecnologias adicionais sem justificativa.

A IA deve produzir propostas.

A aplicação deve validar.

O domínio deve aplicar regras.

A autorização deve determinar se uma ação pode ocorrer.

O banco deve armazenar o estado confirmado.

Depois de cada grande etapa, execute os testes disponíveis e faça uma revisão crítica procurando:

* bugs;
* violações arquiteturais;
* regras de negócio inventadas;
* inconsistências;
* problemas de segurança;
* problemas de escalabilidade;
* acoplamento desnecessário;
* duplicação;
* código morto;
* estados não tratados;
* erros de UX;
* problemas de acessibilidade;
* problemas de dados.

Corrija os problemas encontrados antes de avançar.

## Primeiro objetivo

Construa primeiro um vertical slice completamente funcional:

```text
Mobile/Web
↓
Gravar áudio
↓
Upload temporário
↓
Transcrição
↓
AI interpretation
↓
Structured proposal
↓
Preview
↓
Confirm
↓
Task
↓
PostgreSQL
↓
Homepage
```

Esse fluxo deve ser real, testável e integrado.

Depois expanda progressivamente o sistema.

## Regra final

Não construa simplesmente uma coleção de CRUDs.

Construa o Personal Second Brain definido na documentação.

Quando houver dúvida sobre o significado do produto, consulte os documentos antes de tomar decisões.

Quando houver dúvida técnica, analise as alternativas e escolha a solução tecnicamente justificável.

Comece.
