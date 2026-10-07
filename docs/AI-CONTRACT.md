# AI ↔ Application Contract

## 1. Purpose

The AI is an intelligence component.

It is not the database.

It is not the source of truth.

It is not the authorization layer.

It is not the transaction manager.

---

# 2. Application Authority

The application owns:

* authentication;
* authorization;
* validation;
* database transactions;
* entity identifiers;
* timestamps;
* audit records;
* automation permissions;
* execution of commands.

The AI owns:

* interpretation;
* extraction;
* classification;
* reasoning;
* contextual analysis;
* suggestions.

---

# 3. Basic Flow

```text
Application
    ↓
AI Request
    ↓
AI Response
    ↓
Schema Validation
    ↓
Business Validation
    ↓
Proposal
    ↓
User Confirmation
    ↓
Application Command
```

---

# 4. AI Must Never Directly Write to Database

The AI must not execute:

```text
INSERT
UPDATE
DELETE
```

directly.

Instead:

```text
AI
 ↓
Structured Command Proposal
 ↓
Application Validation
 ↓
Authorization
 ↓
Database Transaction
```

---

# 5. Example

User says:

> "Tenho de terminar o sistema académico sexta."

AI returns:

```json
{
  "intent": "CREATE_TASK",
  "proposal": {
    "title": "Terminar o sistema académico",
    "deadline": "2026-10-09"
  },
  "missingInformation": [],
  "uncertainties": []
}
```

Application then validates:

```text
Does the date correspond to Friday?
Does the project exist?
Is the user authorized?
Does the proposal satisfy business rules?
```

Only after confirmation:

```text
CREATE TASK
```

---

# 6. Invalid Example

The AI must not return:

```json
{
  "executeSql": "INSERT INTO tasks ..."
}
```

or:

```json
{
  "databaseOperation": "DELETE"
}
```

The AI operates at the domain-command level, never at the database-command level.

---

# 7. Structured Intent

Possible intents include:

```text
CAPTURE_NOTE
CREATE_TASK
UPDATE_TASK
COMPLETE_TASK

CREATE_PROJECT
UPDATE_PROJECT

CREATE_IDEA
CONVERT_IDEA_TO_TASK
CONVERT_IDEA_TO_PROJECT

CREATE_COMMITMENT
CREATE_RESPONSIBILITY
CREATE_GOAL

CREATE_INCOME
CREATE_EXPENSE
CREATE_PAYMENT
CREATE_DEBT
CREATE_BUDGET

CREATE_DECISION
CREATE_PROBLEM
CREATE_IMPROVEMENT

ASK_CLARIFICATION
GENERATE_SUGGESTION
GENERATE_REVIEW
SEARCH_CONTEXT
```

The final list belongs to the application domain.

---

# 8. Missing Information

The AI should explicitly report missing fields.

Example:

```json
{
  "intent": "CREATE_TASK",
  "proposal": {
    "title": "Falar com João"
  },
  "missingInformation": [
    {
      "field": "deadline",
      "reason": "Task requires a concrete date."
    }
  ],
  "questions": [
    "Que dia pretende falar com João?"
  ]
}
```

---

# 9. Ambiguous References

Example:

```json
{
  "intent": "UPDATE_PROJECT",
  "proposal": null,
  "ambiguities": [
    {
      "field": "project",
      "candidates": [
        "project_123",
        "project_456"
      ]
    }
  ],
  "questions": [
    "A qual projeto se refere?"
  ]
}
```

---

# 10. No Hallucinated IDs

The AI must never invent:

```text
project_id
task_id
user_id
finance_id
capture_id
```

IDs must come from application context.

---

# 11. Context

The application should provide only relevant context.

Example:

```json
{
  "currentDate": "2026-10-03",
  "timezone": "Africa/Maputo",
  "relevantProjects": [],
  "relevantTasks": [],
  "relevantGoals": [],
  "relevantResponsibilities": []
}
```

Do not send the entire database indiscriminately.

---

# 12. Context Priority

Use:

```text
Current User Input
>
Explicit User Instructions
>
Confirmed Database State
>
Historical Context
>
AI Inference
```

Inference must never override confirmed information.

---

# 13. Response Classes

Every AI response should belong primarily to one class:

```text
INTERPRETATION
QUESTION
PROPOSAL
ANALYSIS
SUGGESTION
SUMMARY
ERROR
```

---

# 14. Execution

The AI does not decide whether it has permission to execute.

The application determines:

```text
Is this operation allowed?
Does automation permit it?
Does this operation require confirmation?
```

---

# 15. Failure

If the AI cannot reliably interpret input:

```json
{
  "type": "QUESTION",
  "reason": "INSUFFICIENT_CONTEXT",
  "questions": [
    "Pode indicar a qual projeto se refere?"
  ]
}
```

The AI should ask rather than hallucinate.
