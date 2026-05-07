
-- Enums
create type public.app_role as enum ('admin', 'member');
create type public.project_role as enum ('admin', 'member');
create type public.task_status as enum ('todo', 'in_progress', 'review', 'done');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- System roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.projects enable row level security;

-- Project members
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role project_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);
alter table public.project_members enable row level security;

-- Helpers (security definer to avoid RLS recursion)
create or replace function public.is_project_member(_user_id uuid, _project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.project_members where user_id = _user_id and project_id = _project_id)
$$;

create or replace function public.is_project_admin(_user_id uuid, _project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members
    where user_id = _user_id and project_id = _project_id and role = 'admin'
  )
  or exists (select 1 from public.projects where id = _project_id and owner_id = _user_id)
$$;

-- Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  assignee_id uuid references auth.users(id) on delete set null,
  due_date date,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tasks enable row level security;

-- Auto profile + default role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.email, ''));

  insert into public.user_roles (user_id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::app_role, 'member'));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger for tasks
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- RLS POLICIES

-- profiles: all authenticated users can read names; users update their own
create policy "Profiles readable to authenticated" on public.profiles
  for select to authenticated using (true);
create policy "Users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- user_roles: user reads own; system admin reads all
create policy "Users see own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "System admins manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- projects
create policy "Members or sysadmin view projects" on public.projects
  for select to authenticated using (
    public.has_role(auth.uid(), 'admin')
    or owner_id = auth.uid()
    or public.is_project_member(auth.uid(), id)
  );
create policy "Authenticated create projects" on public.projects
  for insert to authenticated with check (owner_id = auth.uid());
create policy "Owners or sysadmin update projects" on public.projects
  for update to authenticated using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Owners or sysadmin delete projects" on public.projects
  for delete to authenticated using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Auto-add owner as project admin
create or replace function public.add_owner_as_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'admin')
  on conflict do nothing;
  return new;
end; $$;
create trigger projects_add_owner after insert on public.projects
  for each row execute function public.add_owner_as_admin();

-- project_members
create policy "Members view project members" on public.project_members
  for select to authenticated using (
    public.has_role(auth.uid(), 'admin')
    or public.is_project_member(auth.uid(), project_id)
  );
create policy "Project admins manage members" on public.project_members
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.is_project_admin(auth.uid(), project_id))
  with check (public.has_role(auth.uid(), 'admin') or public.is_project_admin(auth.uid(), project_id));

-- tasks
create policy "Project members view tasks" on public.tasks
  for select to authenticated using (
    public.has_role(auth.uid(), 'admin') or public.is_project_member(auth.uid(), project_id)
  );
create policy "Project members create tasks" on public.tasks
  for insert to authenticated with check (
    created_by = auth.uid() and (
      public.has_role(auth.uid(), 'admin') or public.is_project_member(auth.uid(), project_id)
    )
  );
create policy "Project members update tasks" on public.tasks
  for update to authenticated using (
    public.has_role(auth.uid(), 'admin') or public.is_project_member(auth.uid(), project_id)
  );
create policy "Project admins delete tasks" on public.tasks
  for delete to authenticated using (
    public.has_role(auth.uid(), 'admin') or public.is_project_admin(auth.uid(), project_id)
  );
