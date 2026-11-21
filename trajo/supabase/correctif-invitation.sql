-- Correctif Trajo : création des codes d'invitation (« Serveur introuvable » en touchant « Inviter »).
-- À coller dans Supabase > SQL Editor > New query > Run.
create or replace function public.create_invite(p_group uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.is_admin(p_group) then raise exception 'not_admin'; end if;
  loop
    c := upper(substr(translate(replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), '01', ''), 1, 8));
    exit when length(c) = 8 and not exists (select 1 from invites where code = c);
  end loop;
  insert into invites (code, group_id, created_by) values (c, p_group, auth.uid());
  return c;
end $$;
