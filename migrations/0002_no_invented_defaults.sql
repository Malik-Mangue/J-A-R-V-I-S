-- Correctness follow-up to 0001_init.sql.
--   * task.priority must be nullable: the system must not invent a priority.
--   * finance_entries.currency must be explicit: no silent default currency.

alter table tasks alter column priority drop not null;
alter table tasks alter column priority drop default;

alter table finance_entries alter column currency drop default;