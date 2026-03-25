create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),

  -- Run / audit context
  run_id    text not null,
  audit_id  text,
  domain    text not null default '',
  audit_date date,

  -- Issue group
  issue_type         text    not null,
  severity           text    not null default 'medium'
    check (severity in ('critical', 'high', 'medium', 'low')),
  category           text    not null default '',
  affected_url_count integer not null default 0,
  affected_urls      text[]  not null default '{}',
  affected_domains   text[]  not null default '{}',

  -- Example issue (one concrete URL for agent context)
  example_url           text,
  example_description   text,
  example_recommendation text,
  example_current_value  text,
  example_expected_value text,

  -- Classification (from Stage 1 agent)
  classification text,
  team           text check (team in ('Tech Team', 'Data Team')),
  priority       text check (priority in ('Highest', 'High', 'Medium', 'Low')),

  -- Ticket content (from Stage 1 agent)
  objective             text,
  summary               text,
  why_we_are_doing      text,
  proposed_solution     text,
  code_location         text,
  risk_and_implications text,

  -- Duplicate / related detection (from Stage 2 reviewer)
  duplicate_of_issue_key text,
  duplicate_of_jira_url  text,
  duplicate_of_run_date  text,
  related_to             text[],

  -- Jira reference (populated only after manual "Publish to Jira")
  jira_issue_key          text,
  jira_url                text,
  jira_attachment_created boolean      not null default false,
  jira_published_at       timestamptz,

  -- Lifecycle
  status     text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for common query patterns
create index idx_tickets_run_id    on public.tickets(run_id);
create index idx_tickets_audit_id  on public.tickets(audit_id);
create index idx_tickets_domain    on public.tickets(domain);
create index idx_tickets_status    on public.tickets(status);
create index idx_tickets_team      on public.tickets(team);
create index idx_tickets_severity  on public.tickets(severity);
create index idx_tickets_audit_date on public.tickets(audit_date);

-- RLS: authenticated users can read; service role writes
alter table public.tickets enable row level security;

create policy "Authenticated users can read tickets"
  on public.tickets for select
  to authenticated
  using (true);
