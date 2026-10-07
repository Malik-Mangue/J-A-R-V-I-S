# AI Output Schemas

## 1. Interpretation Response

```json
{
  "type": "INTERPRETATION",
  "intent": "CREATE_TASK",
  "confidence": 0.94,
  "entities": {
    "title": "Terminar módulo de autenticação",
    "projectId": null,
    "deadline": "2026-10-09",
    "period": null,
    "priority": null
  },
  "missingInformation": [],
  "ambiguities": [],
  "uncertainties": []
}
```

---

# 2. Clarification

```json
{
  "type": "QUESTION",
  "reason": "AMBIGUOUS_PROJECT",
  "questions": [
    {
      "id": "q1",
      "text": "A qual projeto se refere?"
    }
  ],
  "candidates": [
    {
      "id": "project_123",
      "name": "Gestão Académica"
    },
    {
      "id": "project_456",
      "name": "Personal Second Brain"
    }
  ]
}
```

---

# 3. Proposal

```json
{
  "type": "PROPOSAL",
  "intent": "CREATE_TASK",
  "proposal": {
    "title": "Terminar módulo de autenticação",
    "deadline": "2026-10-09",
    "projectId": "project_123"
  },
  "changes": [
    {
      "field": "title",
      "value": "Terminar módulo de autenticação"
    },
    {
      "field": "deadline",
      "value": "2026-10-09"
    }
  ],
  "warnings": [],
  "uncertainties": []
}
```

---

# 4. Suggestion

```json
{
  "type": "SUGGESTION",
  "category": "PROJECT_STALLED",
  "title": "Projeto sem progresso recente",
  "observation": "O projeto não possui atividade registada há 18 dias.",
  "evidence": [
    {
      "type": "PROJECT",
      "id": "project_123"
    }
  ],
  "suggestion": "Rever o próximo passo do projeto.",
  "priority": "MEDIUM"
}
```

---

# 5. Weekly Review

```json
{
  "type": "ANALYSIS",
  "period": {
    "start": "2026-09-28",
    "end": "2026-10-04"
  },
  "facts": [],
  "observations": [],
  "patterns": [],
  "problems": [],
  "suggestions": [],
  "futureItems": []
}
```

---

# 6. Required Properties

The application must validate:

```text
type
intent when applicable
schema correctness
valid IDs
valid dates
valid numeric values
allowed enums
required fields
```

The AI response must be rejected if it fails schema validation.
