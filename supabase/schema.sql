-- CHM SMART ATTEND initial schema. Review before running in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  matric_no text not null unique check (char_length(trim(matric_no)) between 3 and 40),
  email text not null unique,
  details_edit_used boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  active boolean not null default true,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  location_name text not null default 'CHM class location',
  latitude double precision,
  longitude double precision,
  radius_m integer not null default 50 check (radius_m between 10 and 1000),
  total_classes integer not null default 20 check (total_classes between 1 and 500),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_users(id) on delete set null
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_open boolean not null default false,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  latitude double precision not null,
  longitude double precision not null,
  reported_accuracy_m double precision,
  unique (session_id, student_id)
);
create index if not exists attendance_records_student_idx on public.attendance_records(student_id);
create index if not exists attendance_records_session_idx on public.attendance_records(session_id);
create index if not exists attendance_sessions_window_idx on public.attendance_sessions(starts_at, ends_at);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admin_users a where a.auth_user_id = auth.uid() and a.active = true);
$$;

create or replace function public.create_student_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_name text;
  v_matric text;
begin
  v_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  v_matric := upper(trim(coalesce(new.raw_user_meta_data ->> 'matric_no', '')));
  if v_name is null or char_length(v_name) < 2 then raise exception 'Please provide your full name.'; end if;
  if char_length(v_matric) < 3 then raise exception 'Please provide a valid matriculation number.'; end if;
  insert into public.profiles (id, full_name, matric_no, email) values (new.id, v_name, v_matric, lower(new.email));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_chm_profile on auth.users;
create trigger on_auth_user_created_chm_profile after insert on auth.users for each row execute procedure public.create_student_profile();

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.app_settings enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

drop policy if exists "Students can read their own profile" on public.profiles;
create policy "Students can read their own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "Students can update their own profile once" on public.profiles;
create policy "Students can update their own profile once" on public.profiles for update to authenticated using (id = auth.uid() and details_edit_used = false) with check (id = auth.uid());
drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can read admin roster" on public.admin_users;
create policy "Admins can read admin roster" on public.admin_users for select to authenticated using (public.is_admin());
drop policy if exists "Admins can manage app settings" on public.app_settings;
create policy "Admins can manage app settings" on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Students can read settings" on public.app_settings;
create policy "Students can read settings" on public.app_settings for select to authenticated using (true);

drop policy if exists "Students can read sessions" on public.attendance_sessions;
create policy "Students can read sessions" on public.attendance_sessions for select to authenticated using (true);
drop policy if exists "Admins can manage sessions" on public.attendance_sessions;
create policy "Admins can manage sessions" on public.attendance_sessions for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Students can read own attendance" on public.attendance_records;
create policy "Students can read own attendance" on public.attendance_records for select to authenticated using (student_id = auth.uid() or public.is_admin());
drop policy if exists "Admins can manage attendance" on public.attendance_records;
create policy "Admins can manage attendance" on public.attendance_records for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Intentionally no student INSERT policy on attendance_records.
-- Check-ins must be handled by a server endpoint/RPC verifying session times,
-- geofence distance, GPS accuracy, and duplicate attendance.
-- Do not let ordinary users write admin_users. Provision the first admin securely
-- after the administrator verification method is finalized.
