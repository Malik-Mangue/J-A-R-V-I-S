# AI Tool Contracts

## Principle

Tools expose controlled application capabilities to the AI.

The AI does not receive unrestricted access to the database.

---

# Context Tools

## search_projects

Purpose:

Find projects relevant to the user's current statement.

Input:

```json
{
  "query": "string"
}
```

Output:

```json
{
  "projects": [
    {
      "id": "project_123",
      "name": "Gestão Académica",
      "status": "ACTIVE"
    }
  ]
}
```

---

## search_tasks

Find relevant tasks.

---

## search_goals

Find relevant goals.

---

## search_responsibilities

Find relevant responsibilities.

---

## search_finance

Find relevant financial context.

---

## search_history

Find relevant historical events.

---

# Analysis Tools

## get_project_context

Returns the complete relevant context of a project.

---

## get_week_context

Returns:

* tasks;
* commitments;
* projects;
* goals;
* responsibilities;
* finance;
* relevant history.

---

## get_financial_summary

Returns financial aggregates.

---

# Action Tools

Actions must be represented as proposals unless the application explicitly authorizes execution.

## propose_task

Creates a task proposal.

## propose_project

Creates a project proposal.

## propose_finance_entry

Creates a finance proposal.

## propose_decision

Creates a decision proposal.

---

# Inbox Tools

## create_inbox_item

Creates a suggestion/attention item.

This may be automatically allowed if the automation policy permits it.

---

# Review Tools

## generate_weekly_review

Generates a review proposal.

---

# Integration Tools

## sync_to_obsidian

Requests synchronization of confirmed data.

The AI should not directly manipulate arbitrary files.

---

# Important

The model should never receive a generic:

```text
execute_sql()
```

tool.

Nor:

```text
delete_everything()
```

Nor an unrestricted filesystem tool.

Tools must correspond to domain capabilities.
