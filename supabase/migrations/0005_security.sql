-- ════════════════════════════════════════════════════════════════════
--  Ya Merito v2 · 0005 · Seguridad
--  El panel LEE con la sesión del usuario: RLS garantiza que cada quien
--  vea solo su negocio, aunque una consulta tenga un error.
--  Las ESCRITURAS van por el servidor con las funciones de 0004.
-- ════════════════════════════════════════════════════════════════════

-- Negocios del usuario actual (se evalúa una vez por consulta, no por fila)
create or replace function public.my_business_ids(p_roles text[] default null)
returns setof uuid language sql stable security definer set search_path = public as $$
  select business_id from public.memberships
   where user_id = auth.uid() and active
     and (p_roles is null or role = any(p_roles));
$$;

alter table public.businesses          enable row level security;
alter table public.locations           enable row level security;
alter table public.memberships         enable row level security;
alter table public.invitations         enable row level security;
alter table public.programs            enable row level security;
alter table public.customers           enable row level security;
alter table public.cards               enable row level security;
alter table public.card_events         enable row level security;
alter table public.daily_stats         enable row level security;
alter table public.apple_devices       enable row level security;
alter table public.apple_registrations enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.billing_events      enable row level security;
alter table public.jobs                enable row level security;
alter table public.rate_limits         enable row level security;

create policy "equipo lee su negocio"  on public.businesses  for select to authenticated using (id in (select public.my_business_ids()));
create policy "equipo lee sucursales"  on public.locations   for select to authenticated using (business_id in (select public.my_business_ids()));
create policy "equipo lee programa"    on public.programs    for select to authenticated using (business_id in (select public.my_business_ids()));
create policy "equipo lee clientes"    on public.customers   for select to authenticated using (business_id in (select public.my_business_ids()));
create policy "equipo lee tarjetas"    on public.cards       for select to authenticated using (business_id in (select public.my_business_ids()));
create policy "equipo lee movimientos" on public.card_events for select to authenticated using (business_id in (select public.my_business_ids()));
create policy "equipo lee resumen"     on public.daily_stats for select to authenticated using (business_id in (select public.my_business_ids()));
create policy "cada quien su membresía y dueños el equipo" on public.memberships for select to authenticated
  using (user_id = auth.uid() or business_id in (select public.my_business_ids(array['owner','manager'])));
create policy "dueños ven invitaciones" on public.invitations for select to authenticated
  using (business_id in (select public.my_business_ids(array['owner','manager'])));
create policy "dueños ven su plan" on public.subscriptions for select to authenticated
  using (business_id in (select public.my_business_ids(array['owner','manager'])));
-- apple_*, billing_events, jobs, rate_limits: sin políticas → solo el servidor.

-- Funciones de escritura y reportes: solo service_role
do $$
declare f text;
begin
  foreach f in array array[
    'public.create_business(uuid, text, text, text, text, int)',
    'public.enroll_customer(uuid, text, text, uuid)',
    'public.add_stamps(uuid, text, uuid, uuid, int, boolean, text)',
    'public.redeem_reward(uuid, text, uuid, uuid)',
    'public.undo_last_stamp(uuid, text, uuid)',
    'public.accept_invitation(text, uuid, text)',
    'public.dashboard_stats(uuid)',
    'public.report_daily(uuid, date, date, uuid)',
    'public.report_staff(uuid, timestamptz, timestamptz)',
    'public.enqueue_job(text, jsonb, text, int)',
    'public.claim_jobs(int, text)',
    'public.complete_job(bigint)',
    'public.fail_job(bigint, text)',
    'public.prune_jobs(int)',
    'public.rate_limit_hit(text, int, int)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
