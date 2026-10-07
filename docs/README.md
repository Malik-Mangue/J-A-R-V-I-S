# Personal Second Brain

Sistema pessoal de captura, organização e acompanhamento de informação através de **voz e texto**, concebido para funcionar principalmente a partir de dispositivos móveis.

O objetivo não é obrigar o utilizador a organizar manualmente a própria vida.

O objetivo é permitir que o utilizador **capture aquilo que está na sua cabeça** e deixe o sistema interpretar, estruturar, relacionar e acompanhar essa informação.

---

## 1. Problema

Grande parte da informação pessoal aparece enquanto a pessoa está longe do computador:

* ideias;
* tarefas;
* compromissos;
* problemas;
* decisões;
* projetos;
* responsabilidades;
* despesas;
* objetivos;
* melhorias;
* pensamentos;
* informações para consultar posteriormente.

O método tradicional exige parar, abrir uma aplicação, encontrar o local correto e organizar manualmente a informação.

Isso cria fricção.

O utilizador deste sistema utiliza principalmente o telemóvel e quer poder simplesmente:

> falar ou escrever aquilo que precisa guardar.

O sistema deverá transformar essa entrada em informação estruturada.

---

## 2. Visão

O sistema funciona como uma camada entre a memória humana e o sistema de organização pessoal.

```text
                  UTILIZADOR
                      │
              ┌───────┴───────┐
              │               │
             VOZ             TEXTO
              │               │
              └───────┬───────┘
                      ▼
                 CAPTURA
                      │
                      ▼
                TRANSCRIÇÃO
                      │
                      ▼
             INTERPRETAÇÃO IA
                      │
                      ▼
                PRÉVIA
                      │
             ┌────────┼────────┐
             ▼        ▼        ▼
          APROVAR   EDITAR   CORRIGIR
             │        │        │
             └────────┼────────┘
                      ▼
              ORGANIZAÇÃO
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
     TAREFAS       PROJETOS      FINANÇAS
        │             │             │
        └─────────────┼─────────────┘
                      ▼
               ACOMPANHAMENTO
                      │
                      ▼
             ANÁLISES E SUGESTÕES
```

---

## 3. Princípio fundamental

### Capture primeiro. Organize depois.

O utilizador não deve precisar decidir antecipadamente:

* onde guardar;
* em que pasta colocar;
* qual categoria escolher;
* qual projeto relacionar;
* qual etiqueta utilizar;
* como estruturar a informação.

A IA deve interpretar o conteúdo.

Entretanto, **a IA não possui autoridade para criar compromissos importantes sem confirmação do utilizador**.

---

## 4. Entrada

O sistema deve aceitar:

### Áudio

A principal forma de interação.

O utilizador pode enviar um ficheiro de áudio gravado no telemóvel.

O sistema:

1. recebe o áudio;
2. transcreve;
3. interpreta;
4. identifica possíveis entidades;
5. classifica;
6. apresenta uma prévia;
7. aguarda confirmação.

### Texto

O utilizador também pode:

* escrever;
* colar texto;
* corrigir uma interpretação;
* criar informação manualmente.

---

## 5. Categorias principais

O sistema deve compreender pelo menos:

* Tarefa
* Compromisso
* Projeto
* Ideia
* Problema
* Melhoria
* Responsabilidade
* Finança
* Objetivo
* Nota
* Informação
* Decisão

As categorias devem ser extensíveis.

---

## 6. Tarefas

Cada tarefa pode possuir:

* título;
* descrição;
* projeto;
* categoria;
* data;
* período;
* estado;
* prioridade;
* contexto;
* dependências;
* notas;
* origem;
* histórico.

Uma tarefa sem prazo suficiente não deve ser simplesmente criada como tarefa pendente.

Quando o utilizador indicar que algo precisa ser feito, mas não fornecer um prazo adequado, o sistema deve solicitar esclarecimento.

Exemplo:

> "Preciso tratar dos documentos."

Sistema:

> "Quando pretendes tratar dos documentos? Podes indicar uma data ou período."

---

## 7. Projetos

Projetos possuem acompanhamento próprio.

Um projeto pode conter:

* objetivo;
* descrição;
* estado;
* progresso;
* prazo;
* entregáveis;
* etapas;
* tarefas;
* problemas;
* ideias;
* melhorias;
* decisões;
* riscos;
* notas;
* documentos;
* histórico;
* próximas ações.

O sistema deve compreender o processo atual do projeto.

Exemplo:

```text
Projeto
  │
  ├── Objetivo
  ├── Entregáveis
  ├── Processo atual
  ├── Progresso
  ├── Próximas ações
  ├── Problemas
  ├── Melhorias
  ├── Ideias
  ├── Decisões
  └── Histórico
```

---

## 8. Ideias

Uma ideia não deve automaticamente tornar-se uma tarefa ou projeto.

Exemplo:

> "Seria interessante adicionar integração com WhatsApp."

Resultado:

```text
Tipo: Ideia
Estado: Consideração
Projeto: X
```

A transformação de uma ideia em projeto deve exigir decisão do utilizador.

---

## 9. Finanças

O sistema deverá possuir um módulo financeiro completo.

Deve suportar, progressivamente:

* receitas;
* despesas;
* saldo;
* categorias;
* orçamento;
* dívidas;
* pagamentos;
* compromissos financeiros;
* despesas recorrentes;
* metas financeiras;
* histórico;
* relatórios;
* análise de evolução.

Exemplo:

> "Gastei 46 meticais no chapa."

Resultado:

```text
Tipo: Despesa
Valor: 46 MZN
Categoria: Transporte
Data: [data da captura]
```

---

## 10. Confirmação humana

Toda interpretação relevante deve apresentar uma prévia.

Exemplo:

```text
ENTENDI:

Tipo:
Tarefa

Título:
Ir ao banco

Data:
09/10/2026

Descrição:
Resolver documentação bancária.

[CONFIRMAR]
[EDITAR]
[FALAR NOVAMENTE]
[CANCELAR]
```

O utilizador deve poder:

* confirmar;
* editar;
* corrigir por voz;
* cancelar.

---

## 11. Inteligência proativa

O sistema não deve limitar-se a armazenar informação.

Ele deverá analisar o histórico e identificar:

* tarefas atrasadas;
* projetos parados;
* objetivos sem progresso;
* excesso de tarefas;
* compromissos futuros;
* padrões financeiros;
* problemas recorrentes;
* oportunidades de melhoria;
* informações contraditórias;
* projetos sem próxima ação;
* responsabilidades negligenciadas.

Exemplo:

> "O projeto X está sem alteração há 15 dias e ainda possui quatro entregáveis pendentes."

O sistema pode sugerir uma ação.

A sugestão não deve ser executada sem autorização.

---

## 12. Visão temporal

O sistema deve fornecer:

### Hoje

O que exige atenção agora.

### Semana

O que está planeado e o que foi concluído.

### Semanas anteriores

O que aconteceu.

### Futuro

Projetos, compromissos, objetivos e responsabilidades.

### Balanço

O sistema deve ser capaz de responder:

* O que fiz?
* O que ficou pendente?
* Em que projetos avancei?
* Onde estou parado?
* Que objetivos estão progredindo?
* O que está atrasado?
* Onde estou gastando dinheiro?
* O que merece atenção?

---

## 13. Banco de dados e Obsidian

O sistema possuirá o seu próprio banco de dados.

A fonte principal de verdade será:

```text
Application Database
```

O Obsidian será tratado como:

```text
Knowledge / Markdown Projection
```

Fluxo conceitual:

```text
Áudio / Texto
      ↓
Aplicação
      ↓
PostgreSQL
      ↓
Processamento confirmado
      ↓
Sincronização
      ↓
Obsidian
```

A aplicação não dependerá do Obsidian para funcionar.

Isso permite utilizar o sistema pelo telemóvel mesmo quando o Obsidian não estiver disponível.

A integração concreta com o Vault será definida posteriormente porque a automação direta depende do ambiente em que o Obsidian estiver disponível. Existem APIs/plugins comunitários capazes de ler e escrever notas e até expor MCP, mas algumas soluções são dependentes do desktop.

---

## 14. Áudios

Os ficheiros de áudio originais não serão armazenados permanentemente pelo sistema.

O sistema armazenará apenas metadados relevantes, quando disponíveis:

* nome do ficheiro;
* data/hora;
* tipo;
* duração, se disponível;
* identificador da captura;
* hash, quando apropriado;
* transcrição;
* relação com as entidades criadas.

Assim será possível fazer auditoria:

```text
Registro
   ↓
audio_2026-10-03_10-42.m4a
   ↓
localizar no telemóvel
   ↓
ouvir gravação original
```

---

## 15. Configuração de automação

O comportamento padrão será conservador:

> **Nenhuma informação importante deve ser criada sem confirmação.**

No futuro, o utilizador poderá configurar categorias ou regras que permitam maior automação.

Exemplo:

```text
Configurações

Tarefas .............. Confirmar
Projetos ............. Confirmar
Finanças ............. Confirmar
Notas ................. Confirmar

[Permitir automação]
```

Essa funcionalidade será controlada explicitamente pelo utilizador.

---

## 16. Plataforma

### Frontend

* React
* Next.js
* JavaScript
* Mobile-first

### Backend inicial

* Next.js
* JavaScript
* API própria

### Banco

* PostgreSQL

### IA

Camada de abstração independente do fornecedor.

O fornecedor/modelo poderá ser alterado sem alterar o domínio da aplicação.

### Obsidian

Integração desacoplada.

### Arquitetura futura

A aplicação deverá permitir separar componentes em serviços independentes caso a escala ou complexidade justifique.

---

## 17. Princípios de engenharia

1. Mobile-first.
2. JavaScript, não TypeScript.
3. Business logic independente da interface.
4. IA desacoplada do domínio.
5. Banco de dados como fonte de verdade.
6. Obsidian como integração, não dependência.
7. Confirmação humana para efeitos importantes.
8. Histórico das alterações.
9. Rastreabilidade da origem das informações.
10. Arquitetura preparada para crescimento.
11. Nenhuma decisão de negócio deve ser inventada pela IA.
12. Decisões puramente técnicas devem ser justificadas e documentadas.

---

## 18. Futuro

Embora inicialmente seja um sistema pessoal, a arquitetura deve permitir posteriormente:

* múltiplos utilizadores;
* autenticação;
* isolamento de dados;
* contas;
* sincronização entre dispositivos;
* colaboração;
* diferentes provedores de IA;
* integrações externas;
* API pública;
* aplicações móveis dedicadas.

Esses recursos não fazem parte do MVP.
