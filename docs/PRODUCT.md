# Product Definition

## 1. Definição do produto

Este produto é um **sistema pessoal de captura, organização, acompanhamento e reflexão**, controlado principalmente por voz.

A finalidade é reduzir a distância entre:

> "Pensei em alguma coisa."

e:

> "Essa coisa está corretamente registrada, organizada e sendo acompanhada."

O utilizador não deve precisar tornar-se administrador do próprio sistema.

O sistema deve assumir grande parte do trabalho mecânico de organização.

---

# 2. Job To Be Done

Quando uma ideia, tarefa, compromisso, problema, despesa ou informação surgir na mente do utilizador, ele quer poder simplesmente:

> falar ou escrever.

O sistema deve transformar essa entrada em informação estruturada, apresentar aquilo que entendeu e permitir ao utilizador confirmar ou corrigir.

Depois da confirmação, o sistema deve manter a informação relacionada e utilizá-la para ajudar o utilizador a acompanhar a própria vida e os próprios projetos.

---

# 3. Regra de autoridade

Existe uma separação entre:

### Autoridade do utilizador

O utilizador decide:

* compromissos;
* prazos;
* criação de projetos;
* transformação de ideias em projetos;
* alterações importantes;
* automações;
* decisões de negócio.

### Capacidade da IA

A IA pode:

* interpretar;
* classificar;
* relacionar;
* resumir;
* detectar inconsistências;
* sugerir;
* perguntar;
* analisar;
* identificar padrões.

A IA não deve assumir autoridade que pertence ao utilizador.

---

# 4. Princípio da dúvida

Quando o sistema não possui informação suficiente para tomar uma decisão de negócio, deve perguntar.

Exemplo:

> "Tenho de resolver isso na próxima semana."

Se o sistema não souber qual dia ou período suficiente para representar o compromisso:

> "Qual dia da próxima semana?"

Outro exemplo:

> "Terminei aquele projeto."

Se existirem vários projetos plausíveis:

> "Qual projeto queres marcar como concluído?"

O sistema não deve adivinhar silenciosamente.

---

# 5. Modelo mental

O produto deve pensar em:

```text
CAPTURA
↓
ENTENDIMENTO
↓
CONFIRMAÇÃO
↓
ORGANIZAÇÃO
↓
ACOMPANHAMENTO
↓
REFLEXÃO
↓
SUGESTÃO
```

Não apenas:

```text
CAPTURA
↓
TAREFA
```

---

# 6. Segunda memória

O sistema funciona como uma segunda memória operacional.

Ele deve lembrar:

* o que foi pensado;
* o que foi decidido;
* o que precisa ser feito;
* o que já foi feito;
* o que está atrasado;
* o que pertence a cada projeto;
* quais problemas existem;
* quais ideias aguardam decisão;
* quais objetivos estão sendo perseguidos;
* quais compromissos financeiros existem.

---

# 7. Acompanhamento

O sistema deve periodicamente conseguir produzir uma visão como:

## Balanço semanal

### Concluído

* tarefas;
* entregáveis;
* avanços.

### Pendente

* tarefas;
* compromissos;
* entregáveis.

### Projetos

* projetos avançados;
* projetos parados;
* projetos em risco.

### Objetivos

* progresso;
* estagnação;
* mudanças.

### Finanças

* receitas;
* despesas;
* categorias;
* evolução.

### Próximo período

* compromissos;
* prioridades definidas;
* pendências;
* decisões necessárias.

### Observações da IA

A IA pode apresentar padrões e perguntas.

Exemplo:

> "Tens três projetos ativos, mas apenas um recebeu alterações nesta semana. Queres rever os outros?"

---

# 8. Projetos como sistemas vivos

Um projeto não é simplesmente uma lista de tarefas.

Ele possui:

```text
Objetivo
   ↓
Entregáveis
   ↓
Processo
   ↓
Estado atual
   ↓
Tarefas
   ↓
Problemas
   ↓
Decisões
   ↓
Melhorias
   ↓
Ideias
   ↓
Histórico
```

A aplicação deve manter esse contexto.

---

# 9. Proveniência

Toda informação originada de uma captura deve possuir uma relação com sua origem.

Exemplo:

```text
Task #1024
   │
   ├── origem: voice_capture
   ├── source_filename: audio_2026-10-03_10-42.m4a
   ├── transcription_id: #884
   └── created_at: ...
```

Isso permite auditoria e correção.

---

# 10. Fonte de verdade

A ordem de autoridade será:

```text
UTILIZADOR
     ↓
CONFIRMAÇÃO
     ↓
BANCO DA APLICAÇÃO
     ↓
INTEGRAÇÕES
     ↓
OBSIDIAN
```

O Obsidian não deve sobrescrever silenciosamente o estado principal da aplicação.

Qualquer sincronização bidirecional futura deverá possuir regras explícitas de conflito.

---

# 11. Objetivo futuro

O sistema deve evoluir de:

> "Onde anotei isso?"

para:

> "O sistema já sabe onde isso está, como se relaciona com o resto e pode me ajudar a decidir o próximo passo."

Esse é o objetivo central do produto.
