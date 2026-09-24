-- Discovery Voice Survey: initial schema.
-- All access goes through server-side code using the service-role key.
-- RLS is enabled with NO policies, so the anon/authenticated roles can read/write nothing directly.

create extension if not exists pgcrypto;

create table surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 2000),
  status text not null default 'draft' check (status in ('draft','active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references surveys(id) on delete cascade,
  position int not null check (position >= 0),
  text text not null check (char_length(text) between 1 and 1000),
  required boolean not null default true
);
create index questions_survey_idx on questions(survey_id, position);

-- One participant per SME; the token is the access credential in their personal link.
create table participants (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references surveys(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 100),
  token text not null unique check (char_length(token) = 43),
  created_at timestamptz not null default now(),
  unique (survey_id, label)
);

create table responses (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references participants(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  started_at timestamptz,
  completed_at timestamptz
);

create table answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references responses(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  answer text not null check (char_length(answer) <= 10000),
  input_method text not null default 'text' check (input_method in ('text','voice')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (response_id, question_id)
);

alter table surveys enable row level security;
alter table questions enable row level security;
alter table participants enable row level security;
alter table responses enable row level security;
alter table answers enable row level security;

-- Replace a survey's questions atomically (used when no answers exist yet).
create or replace function replace_questions(p_survey_id uuid, p_questions jsonb)
returns void language plpgsql security invoker as $$
begin
  delete from questions where survey_id = p_survey_id;
  insert into questions (survey_id, position, text, required)
  select p_survey_id, (ord - 1)::int, item->>'text', coalesce((item->>'required')::boolean, true)
  from jsonb_array_elements(p_questions) with ordinality as t(item, ord);
end $$;
revoke all on function replace_questions(uuid, jsonb) from public, anon, authenticated;
