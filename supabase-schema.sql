create table if not exists clients (
  id text primary key,
  company_name text not null,
  country text not null,
  entity_type text not null
);

create table if not exists tasks (
  id text primary key,
  client_id text not null references clients(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null,
  due_date date not null,
  status text not null check (status in ('Pending', 'In Progress', 'Completed')),
  priority text not null check (priority in ('Low', 'Medium', 'High')),
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_client_id on tasks(client_id);
create index if not exists idx_tasks_due_date on tasks(due_date);
