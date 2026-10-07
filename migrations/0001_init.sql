-- Personal Second Brain - initial schema
-- PostgreSQL is the source of truth (docs/ARCHITECTURE.md #24).
-- Identifiers are application-generated prefixed text ids (docs/AI-CONTRACT.md #10).

create table if not exists users (
  id            text primary key,
  display_name  text,
  timezone      text not null default 'Africa/Maputo',
  locale        text,
  created_at    timestamptz not null default now()
);

-- Original user input. Audio files are NOT stored; only provenance metadata.
create table if not exists captures (
  id                text primary key,
  user_id           text not null references users(id) on delete cascade,
  type              text not null check (type in ('VOICE', 'TEXT')),
  source            text,
  text_content      text,
  original_filename text,
  mime_type         text,
  duration_ms       integer,
  size_bytes        bigint,
  hash              text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create table if not exists transcriptions (
  id           text primary key,
  capture_id   text not null references captures(id) on delete cascade,
  text_content text not null,
  language     text,
  provider     text,
  confidence   numeric(4, 3),
  duration_ms  integer,
  created_at   timestamptz not null default now()
);

create table if not exists interpretations (
  id                 text primary key,
  user_id            text not null references users(id) on delete cascade,
  capture_id         text not null references captures(id) on delete cascade,
  transcription_id   text references transcriptions(id) on delete set null,
  intent             text not null,
  confidence         numeric(4, 3) not null default 0,
  entities           jsonb not null default '{}'::jsonb,
  missing_information jsonb not null default '[]'::jsonb,
  ambiguities        jsonb not null default '[]'::jsonb,
  uncertainties      jsonb not null default '[]'::jsonb,
  questions          jsonb not null default '[]'::jsonb,
  created_at         timestamptz not null default now()
);

create table if not exists projects (
  id               text primary key,
  user_id          text not null references users(id) on delete cascade,
  name             text not null,
  objective        text,
  description      text,
  status           text not null default 'ACTIVE'
                     check (status in ('PLANNED','ACTIVE','PAUSED','STALLED','COMPLETED','CANCELLED')),
  progress         integer not null default 0 check (progress between 0 and 100),
  deadline         date,
  next_action      text,
  provenance       jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_activity_at timestamptz
);

create table if not exists tasks (
  id           text primary key,
  user_id      text not null references users(id) on delete cascade,
  title        text not null,
  description  text,
  status       text not null default 'PENDING'
                 check (status in ('PENDING','IN_PROGRESS','COMPLETED','CANCELLED','BLOCKED')),
  priority     text not null default 'MEDIUM'
                 check (priority in ('LOW','MEDIUM','HIGH','URGENT')),
  deadline     date,
  period_kind  text,
  period_label text,
  period_start date,
  period_end   date,
  project_id   text references projects(id) on delete set null,
  context      text,
  dependencies jsonb not null default '[]'::jsonb,
  notes        text,
  source       text,
  provenance   jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz,
  -- Business rule enforced by the database as a second line of defence:
  -- a task must carry a concrete date or a period (docs/README.md #6).
  constraint tasks_need_temporal_reference check (deadline is not null or period_end is not null)
);

create table if not exists ideas (
  id                text primary key,
  user_id           text not null references users(id) on delete cascade,
  title             text not null,
  description       text,
  context           text,
  project_id        text references projects(id) on delete set null,
  status            text not null default 'CONSIDERING'
                      check (status in ('CONSIDERING','PARKED','CONVERTED_TO_TASK','CONVERTED_TO_PROJECT','DISCARDED')),
  source            text,
  provenance        jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  converted_to_id   text,
  converted_to_type text
);

create table if not exists finance_entries (
  id           text primary key,
  user_id      text not null references users(id) on delete cascade,
  type         text not null check (type in ('INCOME','EXPENSE','TRANSFER')),
  amount_minor bigint not null check (amount_minor > 0),
  currency     text not null default 'MZN',
  category     text not null default 'OUTROS',
  description  text,
  occurred_on  date not null,
  source       text,
  provenance   jsonb,
  created_at   timestamptz not null default now()
);

create table if not exists proposals (
  id                  text primary key,
  user_id             text not null references users(id) on delete cascade,
  capture_id          text not null references captures(id) on delete cascade,
  interpretation_id   text references interpretations(id) on delete set null,
  intent              text not null,
  payload             jsonb,
  changes             jsonb not null default '[]'::jsonb,
  warnings            jsonb not null default '[]'::jsonb,
  status              text not null default 'PENDING'
                        check (status in ('PENDING','CONFIRMED','CANCELLED','SUPERSEDED')),
  result_entity_id    text,
  result_entity_type  text,
  cancellation_reason text,
  created_at          timestamptz not null default now(),
  resolved_at         timestamptz
);

create table if not exists inbox_items (
  id                  text primary key,
  user_id             text not null references users(id) on delete cascade,
  type                text not null,
  title               text not null,
  description         text,
  evidence            jsonb not null default '[]'::jsonb,
  priority            text not null default 'MEDIUM' check (priority in ('LOW','MEDIUM','HIGH')),
  status              text not null default 'OPEN'
                        check (status in ('OPEN','IN_PROGRESS','RESOLVED','DISMISSED','SNOOZED')),
  related_entity_id   text,
  related_entity_type text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz,
  snoozed_until       date
);

-- Append-only audit trail (docs/ARCHITECTURE.md #36).
create table if not exists events (
  id          text primary key,
  user_id     text not null,
  type        text not null,
  entity_type text not null,
  entity_id   text,
  occurred_at timestamptz not null default now(),
  payload     jsonb not null default '{}'::jsonb
);

create table if not exists automation_settings (
  user_id    text primary key references users(id) on delete cascade,
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_captures_user_created on captures (user_id, created_at desc);
create index if not exists idx_tasks_user_status on tasks (user_id, status);
create index if not exists idx_tasks_deadline on tasks (deadline);
create index if not exists idx_tasks_project on tasks (project_id);
create index if not exists idx_ideas_user_status on ideas (user_id, status);
create index if not exists idx_inbox_user_status on inbox_items (user_id, status);
create index if not exists idx_proposals_status on proposals (status);
create index if not exists idx_events_entity on events (entity_type, entity_id);
create index if not exists idx_finance_user_occurred on finance_entries (user_id, occurred_on desc);

