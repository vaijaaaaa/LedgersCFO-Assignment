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

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table clients to anon, authenticated;
grant select, insert, update, delete on table tasks to anon, authenticated;

alter table clients enable row level security;
alter table tasks enable row level security;

drop policy if exists "clients_all_anon" on clients;
create policy "clients_all_anon"
on clients
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "tasks_all_anon" on tasks;
create policy "tasks_all_anon"
on tasks
for all
to anon, authenticated
using (true)
with check (true);
