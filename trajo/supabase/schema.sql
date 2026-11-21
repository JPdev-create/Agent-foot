-- =====================================================================
-- Trajo · groupes et partage de position (Supabase)
-- À coller tel quel dans Supabase > SQL Editor > New query > Run.
-- Le script peut être relancé sans risque (il ne supprime aucune donnée).
-- =====================================================================


-- ---------- Tables ----------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  color       integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 40),
  owner       uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.members (
  group_id    uuid not null references public.groups (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'member' check (role in ('admin', 'member')),
  sharing     boolean not null default true,   -- ce membre partage-t-il sa position avec ce groupe ?
  joined_at   timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists members_user_idx on public.members (user_id);

create table if not exists public.invites (
  code        text primary key,
  group_id    uuid not null references public.groups (id) on delete cascade,
  created_by  uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  revoked     boolean not null default false
);

-- Une ligne par utilisateur : position en direct pendant un trajet, sinon dernier stationnement.
create table if not exists public.positions (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  live        boolean not null default false,
  lat         double precision,
  lon         double precision,
  speed       real,              -- km/h
  trip_start  timestamptz,
  trip_km     real,
  trail       text,              -- derniers points du trajet « lat,lon;lat,lon… »
  parked_lat  double precision,
  parked_lon  double precision,
  parked_at   timestamptz,
  updated_at  timestamptz not null default now()
);

alter table public.profiles  enable row level security;
alter table public.groups    enable row level security;
alter table public.members   enable row level security;
alter table public.invites   enable row level security;
alter table public.positions enable row level security;

-- ---------- Fonctions utilitaires (sans récursion dans les règles) ----------

create or replace function public.is_member(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where group_id = g and user_id = auth.uid());
$$;

create or replace function public.is_admin(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where group_id = g and user_id = auth.uid() and role = 'admin');
$$;

-- u partage-t-il sa position avec moi (au moins un groupe commun où il partage) ?
create or replace function public.shares_with_me(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members a join members b on a.group_id = b.group_id
    where a.user_id = u and a.sharing and b.user_id = auth.uid());
$$;

create or replace function public.knows(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select u = auth.uid() or exists (
    select 1 from members a join members b on a.group_id = b.group_id
    where a.user_id = u and b.user_id = auth.uid());
$$;

-- ---------- Règles d'accès (RLS) ----------

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (public.knows(id));
drop policy if exists profiles_write on public.profiles;
create policy profiles_write on public.profiles for insert with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists groups_read on public.groups;
create policy groups_read on public.groups for select using (public.is_member(id));
drop policy if exists groups_rename on public.groups;
create policy groups_rename on public.groups for update using (public.is_admin(id)) with check (public.is_admin(id));

drop policy if exists members_read on public.members;
create policy members_read on public.members for select using (public.is_member(group_id));
-- Pas d'écriture directe sur members (sinon un membre pourrait se nommer admin) :
-- tout passe par les fonctions (set_sharing, leave_group…).
drop policy if exists members_self_update on public.members;

-- invites : aucun accès direct, tout passe par les fonctions ci-dessous.

drop policy if exists positions_read on public.positions;
create policy positions_read on public.positions for select using (user_id = auth.uid() or public.shares_with_me(user_id));
drop policy if exists positions_insert on public.positions;
create policy positions_insert on public.positions for insert with check (user_id = auth.uid());
drop policy if exists positions_update on public.positions;
create policy positions_update on public.positions for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Fonctions appelées par l'appli ----------

create or replace function public.save_profile(p_name text, p_color integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into profiles (id, name, color) values (auth.uid(), left(trim(p_name), 40), coalesce(p_color, 0))
  on conflict (id) do update set name = excluded.name, color = excluded.color;
end $$;

create or replace function public.create_group(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if (select count(*) from members where user_id = auth.uid()) >= 20 then raise exception 'too_many_groups'; end if;
  insert into groups (name, owner) values (left(trim(p_name), 40), auth.uid()) returning id into g;
  insert into members (group_id, user_id, role) values (g, auth.uid(), 'admin');
  return g;
end $$;

create or replace function public.create_invite(p_group uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.is_admin(p_group) then raise exception 'not_admin'; end if;
  loop
    -- gen_random_uuid() est intégré à Postgres (pas besoin de l'extension pgcrypto, rangée ailleurs sur Supabase).
    c := upper(substr(translate(replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), '01', ''), 1, 8));
    exit when length(c) = 8 and not exists (select 1 from invites where code = c);
  end loop;
  insert into invites (code, group_id, created_by) values (c, p_group, auth.uid());
  return c;
end $$;

-- Ce que voit la personne invitée avant d'accepter ou de refuser.
create or replace function public.invite_info(p_code text) returns json
language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  select json_build_object(
      'group_id', g.id,
      'group_name', g.name,
      'inviter', coalesce(p.name, 'Quelqu''un'),
      'members', (select count(*) from members m where m.group_id = g.id),
      'already_member', exists (select 1 from members m where m.group_id = g.id and m.user_id = auth.uid()),
      'valid', (not i.revoked and i.expires_at > now()))
    into r
  from invites i join groups g on g.id = i.group_id
  left join profiles p on p.id = i.created_by
  where i.code = upper(trim(p_code));
  if r is null then raise exception 'invite_not_found'; end if;
  return r;
end $$;

create or replace function public.accept_invite(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select group_id into g from invites
   where code = upper(trim(p_code)) and not revoked and expires_at > now();
  if g is null then raise exception 'invite_invalid'; end if;
  insert into members (group_id, user_id, role) values (g, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;
  return g;
end $$;

create or replace function public.revoke_invites(p_group uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_group) then raise exception 'not_admin'; end if;
  update invites set revoked = true where group_id = p_group;
end $$;

create or replace function public.leave_group(p_group uuid) returns void
language plpgsql security definer set search_path = public as $$
declare next_admin uuid;
begin
  delete from members where group_id = p_group and user_id = auth.uid();
  if not exists (select 1 from members where group_id = p_group) then
    delete from groups where id = p_group;
  elsif not exists (select 1 from members where group_id = p_group and role = 'admin') then
    select user_id into next_admin from members where group_id = p_group order by joined_at limit 1;
    update members set role = 'admin' where group_id = p_group and user_id = next_admin;
    update groups set owner = next_admin where id = p_group;
  end if;
end $$;

create or replace function public.remove_member(p_group uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_group) then raise exception 'not_admin'; end if;
  if p_user = auth.uid() then raise exception 'use_leave_group'; end if;
  delete from members where group_id = p_group and user_id = p_user;
end $$;

create or replace function public.set_role(p_group uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(p_group) then raise exception 'not_admin'; end if;
  update members set role = p_role where group_id = p_group and user_id = p_user;
end $$;

create or replace function public.set_sharing(p_group uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update members set sharing = p_on where group_id = p_group and user_id = auth.uid();
end $$;

create or replace function public.delete_group(p_group uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from groups where id = p_group and owner = auth.uid()) then raise exception 'not_owner'; end if;
  delete from groups where id = p_group;
end $$;

-- Envoi de ma position (appelé pendant un trajet et à la fin).
create or replace function public.update_position(
  p_live boolean, p_lat double precision, p_lon double precision, p_speed real,
  p_trip_start timestamptz, p_trip_km real, p_trail text,
  p_parked_lat double precision, p_parked_lon double precision, p_parked_at timestamptz) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into positions as p (user_id, live, lat, lon, speed, trip_start, trip_km, trail, parked_lat, parked_lon, parked_at, updated_at)
  values (auth.uid(), p_live, p_lat, p_lon, p_speed, p_trip_start, p_trip_km, left(p_trail, 20000),
          p_parked_lat, p_parked_lon, p_parked_at, now())
  on conflict (user_id) do update set
    live = excluded.live, lat = excluded.lat, lon = excluded.lon, speed = excluded.speed,
    trip_start = excluded.trip_start, trip_km = excluded.trip_km, trail = excluded.trail,
    parked_lat = coalesce(excluded.parked_lat, p.parked_lat),
    parked_lon = coalesce(excluded.parked_lon, p.parked_lon),
    parked_at  = coalesce(excluded.parked_at,  p.parked_at),
    updated_at = now();
end $$;

-- Mes groupes, avec le nombre de membres et de membres en route.
create or replace function public.my_groups() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x.joined_at), '[]'::json) from (
    select g.id, g.name, m.role, m.sharing, m.joined_at,
      (select count(*) from members mm where mm.group_id = g.id) as members,
      (select count(*) from members mm join positions p on p.user_id = mm.user_id
        where mm.group_id = g.id and mm.sharing and mm.user_id <> auth.uid()
          and p.live and p.updated_at > now() - interval '10 minutes') as live
    from members m join groups g on g.id = m.group_id
    where m.user_id = auth.uid()) x;
$$;

-- Tout l'état d'un groupe en un appel : membres, profils, positions (si partagées).
create or replace function public.group_state(p_group uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  if not public.is_member(p_group) then raise exception 'not_member'; end if;
  select json_build_object(
    'id', g.id, 'name', g.name, 'owner', g.owner, 'me', auth.uid(), 'now', now(),
    'members', coalesce((select json_agg(json_build_object(
        'user_id', m.user_id, 'role', m.role, 'sharing', m.sharing,
        'name', coalesce(pr.name, 'Membre'), 'color', coalesce(pr.color, 0),
        'pos', case when m.sharing then (select row_to_json(p) from positions p where p.user_id = m.user_id) end)
        order by m.joined_at)
      from members m left join profiles pr on pr.id = m.user_id where m.group_id = g.id), '[]'::json))
  into r from groups g where g.id = p_group;
  return r;
end $$;

-- Droits d'exécution : seulement pour les utilisateurs connectés (y compris anonymes).
revoke all on function public.save_profile(text, integer), public.create_group(text), public.create_invite(uuid),
  public.invite_info(text), public.accept_invite(text), public.revoke_invites(uuid), public.leave_group(uuid),
  public.remove_member(uuid, uuid), public.set_role(uuid, uuid, text), public.set_sharing(uuid, boolean),
  public.delete_group(uuid), public.my_groups(), public.group_state(uuid),
  public.update_position(boolean, double precision, double precision, real, timestamptz, real, text, double precision, double precision, timestamptz)
  from public, anon;
grant execute on function public.save_profile(text, integer), public.create_group(text), public.create_invite(uuid),
  public.invite_info(text), public.accept_invite(text), public.revoke_invites(uuid), public.leave_group(uuid),
  public.remove_member(uuid, uuid), public.set_role(uuid, uuid, text), public.set_sharing(uuid, boolean),
  public.delete_group(uuid), public.my_groups(), public.group_state(uuid),
  public.update_position(boolean, double precision, double precision, real, timestamptz, real, text, double precision, double precision, timestamptz)
  to authenticated;
