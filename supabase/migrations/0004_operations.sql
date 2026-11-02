-- ════════════════════════════════════════════════════════════════════
--  Ya Merito v2 · 0004 · Operaciones atómicas
--  Toda escritura de sellos pasa por aquí. Cada función:
--    1. bloquea la fila de la tarjeta (dos cajeros a la vez no pierden sellos)
--    2. escribe el movimiento en el libro
--    3. encola la actualización de la wallet en la MISMA transacción
--  Solo el servidor (service_role) puede llamarlas.
-- ════════════════════════════════════════════════════════════════════

-- ─── Alta de negocio (registro self-serve) ───────────────────────────
create or replace function public.create_business(
  p_user_id uuid, p_owner_name text, p_name text, p_slug text, p_category text, p_trial_days int default 14
) returns public.businesses
language plpgsql security definer set search_path = public as $$
declare
  v_slug     text := p_slug;
  v_n        int := 1;
  v_business public.businesses;
  v_location public.locations;
  v_reward   text;
  v_required int;
  v_icon     text;
begin
  while exists (select 1 from public.businesses where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := left(p_slug, 44) || '-' || v_n;
  end loop;

  insert into public.businesses (slug, name, category)
  values (v_slug, trim(p_name), coalesce(p_category, 'otro'))
  returning * into v_business;

  insert into public.locations (business_id, name)
  values (v_business.id, 'Matriz')
  returning * into v_location;

  insert into public.memberships (business_id, user_id, name, role)
  values (v_business.id, p_user_id, coalesce(trim(p_owner_name), ''), 'owner');

  select r, n, i into v_reward, v_required, v_icon from (values
    ('cafeteria',   'Un café gratis',             8, 'cup'),
    ('taqueria',    'Una orden de tacos gratis', 10, 'taco'),
    ('restaurante', 'Un postre gratis',           8, 'star'),
    ('panaderia',   'Una pieza de pan gratis',    8, 'heart'),
    ('barberia',    'Un corte gratis',            6, 'scissors'),
    ('estetica',    'Un servicio gratis',         6, 'heart'),
    ('tienda',      'Un producto gratis',        10, 'star'),
    ('otro',        'Un producto gratis',         8, 'check')
  ) as d(c, r, n, i) where d.c = v_business.category;

  insert into public.programs (business_id, reward_description, stamps_required, stamp_icon)
  values (v_business.id, coalesce(v_reward, 'Un producto gratis'), coalesce(v_required, 8), coalesce(v_icon, 'check'));

  insert into public.subscriptions (business_id, plan, status, trial_ends_at)
  values (v_business.id, 'pro', 'trialing', now() + make_interval(days => p_trial_days));

  return v_business;
end $$;

-- ─── Alta de cliente (idempotente: mismo celular = misma tarjeta) ────
create or replace function public.enroll_customer(
  p_business_id uuid, p_name text, p_phone text, p_location_id uuid default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_program  public.programs;
  v_customer public.customers;
  v_card     public.cards;
  v_created  boolean := false;
begin
  select * into v_program from public.programs where business_id = p_business_id and active;
  if not found then raise exception 'program_not_found'; end if;

  insert into public.customers (business_id, name, phone, first_location_id)
  values (p_business_id, trim(p_name), p_phone, p_location_id)
  on conflict (business_id, phone) do nothing;
  select * into v_customer from public.customers where business_id = p_business_id and phone = p_phone;

  insert into public.cards (business_id, program_id, customer_id)
  values (p_business_id, v_program.id, v_customer.id)
  on conflict (program_id, customer_id) do nothing
  returning * into v_card;

  if v_card.id is not null then
    v_created := true;
    insert into public.card_events (business_id, card_id, location_id, kind, delta, stamps_after)
    values (p_business_id, v_card.id, p_location_id, 'enroll', 0, 0);
  else
    select * into v_card from public.cards where program_id = v_program.id and customer_id = v_customer.id;
  end if;

  return json_build_object('serial', v_card.serial_number, 'created', v_created);
end $$;

-- ─── Sellar ──────────────────────────────────────────────────────────
create or replace function public.add_stamps(
  p_business_id uuid, p_serial text, p_membership_id uuid, p_location_id uuid,
  p_qty int default 1, p_force boolean default false, p_ticket_ref text default null
) returns public.cards
language plpgsql security definer set search_path = public as $$
declare
  v_card    public.cards;
  v_program public.programs;
  v_qty     int;
begin
  select * into v_card from public.cards
   where serial_number = p_serial and business_id = p_business_id
   for update;
  if not found then raise exception 'card_not_found'; end if;

  select * into v_program from public.programs where id = v_card.program_id;

  if p_qty is null or p_qty < 1 or p_qty > v_program.max_stamps_per_visit then
    raise exception 'invalid_quantity';
  end if;
  if v_card.stamps >= v_program.stamps_required then raise exception 'card_full'; end if;
  if not p_force and v_card.last_stamp_at is not null
     and v_card.last_stamp_at > now() - make_interval(secs => v_program.min_seconds_between_stamps) then
    raise exception 'too_soon';
  end if;

  v_qty := least(p_qty, v_program.stamps_required - v_card.stamps);

  update public.cards
     set stamps = stamps + v_qty,
         lifetime_stamps = lifetime_stamps + v_qty,
         visits = visits + 1,
         last_stamp_at = now()
   where id = v_card.id
  returning * into v_card;

  update public.customers set last_visit_at = now() where id = v_card.customer_id;

  insert into public.card_events (business_id, card_id, location_id, membership_id, kind, delta, stamps_after, ticket_ref)
  values (p_business_id, v_card.id, p_location_id, p_membership_id, 'stamp', v_qty, v_card.stamps, nullif(trim(p_ticket_ref), ''));

  perform public.enqueue_job('wallet.sync_card', json_build_object('serial', v_card.serial_number)::jsonb, 'card:' || v_card.serial_number);
  return v_card;
end $$;

-- ─── Canjear premio ──────────────────────────────────────────────────
create or replace function public.redeem_reward(
  p_business_id uuid, p_serial text, p_membership_id uuid, p_location_id uuid
) returns public.cards
language plpgsql security definer set search_path = public as $$
declare
  v_card    public.cards;
  v_program public.programs;
begin
  select * into v_card from public.cards
   where serial_number = p_serial and business_id = p_business_id
   for update;
  if not found then raise exception 'card_not_found'; end if;

  select * into v_program from public.programs where id = v_card.program_id;
  if v_card.stamps < v_program.stamps_required then raise exception 'not_enough_stamps'; end if;

  update public.cards
     set stamps = stamps - v_program.stamps_required,
         redemptions = redemptions + 1
   where id = v_card.id
  returning * into v_card;

  insert into public.card_events (business_id, card_id, location_id, membership_id, kind, delta, stamps_after, reward_description)
  values (p_business_id, v_card.id, p_location_id, p_membership_id, 'redeem', -v_program.stamps_required, v_card.stamps, v_program.reward_description);

  perform public.enqueue_job('wallet.sync_card', json_build_object('serial', v_card.serial_number)::jsonb, 'card:' || v_card.serial_number);
  return v_card;
end $$;

-- ─── Deshacer el último sello (10 min, y solo si no hubo canje después) ─
create or replace function public.undo_last_stamp(
  p_business_id uuid, p_serial text, p_membership_id uuid
) returns public.cards
language plpgsql security definer set search_path = public as $$
declare
  v_card  public.cards;
  v_event public.card_events;
begin
  select * into v_card from public.cards
   where serial_number = p_serial and business_id = p_business_id
   for update;
  if not found then raise exception 'card_not_found'; end if;

  select * into v_event from public.card_events e
   where e.card_id = v_card.id and e.kind = 'stamp'
     and not exists (select 1 from public.card_events u where u.reverts_event_id = e.id)
   order by e.created_at desc, e.id desc
   limit 1;

  if not found
     or v_event.created_at < now() - interval '10 minutes'
     or exists (select 1 from public.card_events r
                 where r.card_id = v_card.id and r.kind = 'redeem' and r.id > v_event.id) then
    raise exception 'nothing_to_undo';
  end if;

  update public.cards
     set stamps = greatest(stamps - v_event.delta, 0),
         lifetime_stamps = greatest(lifetime_stamps - v_event.delta, 0),
         visits = greatest(visits - 1, 0),
         last_stamp_at = null
   where id = v_card.id
  returning * into v_card;

  insert into public.card_events (business_id, card_id, location_id, membership_id, kind, delta, stamps_after, reverts_event_id)
  values (p_business_id, v_card.id, v_event.location_id, p_membership_id, 'undo', -v_event.delta, v_card.stamps, v_event.id);

  perform public.enqueue_job('wallet.sync_card', json_build_object('serial', v_card.serial_number)::jsonb, 'card:' || v_card.serial_number);
  return v_card;
end $$;

-- ─── Aceptar invitación al equipo ────────────────────────────────────
create or replace function public.accept_invitation(p_token_hash text, p_user_id uuid, p_name text)
returns public.memberships
language plpgsql security definer set search_path = public as $$
declare
  v_inv public.invitations;
  v_mem public.memberships;
begin
  select * into v_inv from public.invitations where token_hash = p_token_hash for update;
  if not found or v_inv.revoked_at is not null then raise exception 'invitation_invalid'; end if;
  if v_inv.accepted_at is not null then raise exception 'invitation_used'; end if;
  if v_inv.expires_at < now() then raise exception 'invitation_expired'; end if;

  insert into public.memberships (business_id, user_id, name, role, location_id)
  values (v_inv.business_id, p_user_id, coalesce(nullif(trim(p_name), ''), coalesce(v_inv.name, '')), v_inv.role, v_inv.location_id)
  on conflict (business_id, user_id) do update
    set active = true,
        location_id = excluded.location_id,
        name = case when public.memberships.role = 'owner' then public.memberships.name else excluded.name end,
        role = case when public.memberships.role = 'owner' then 'owner' else excluded.role end
  returning * into v_mem;

  update public.invitations set accepted_at = now(), accepted_by = p_user_id where id = v_inv.id;
  return v_mem;
end $$;

-- ─── Si cambia el diseño, se actualizan todos los pases (vía la cola) ─
create or replace function public.programs_enqueue_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.name, new.stamps_required, new.reward_description, new.terms, new.background_color,
      new.foreground_color, new.label_color, new.stamp_icon)
     is distinct from
     (old.name, old.stamps_required, old.reward_description, old.terms, old.background_color,
      old.foreground_color, old.label_color, old.stamp_icon) then
    -- 5 s de espera: varios cambios seguidos en el editor = una sola actualización
    perform public.enqueue_job('wallet.sync_program', json_build_object('program_id', new.id)::jsonb, 'program:' || new.id, 5);
  end if;
  return new;
end $$;
create trigger programs_enqueue_sync after update on public.programs
  for each row execute function public.programs_enqueue_sync();

create or replace function public.businesses_enqueue_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_program uuid;
begin
  if (new.name, new.logo_url, new.address, new.phone) is distinct from (old.name, old.logo_url, old.address, old.phone) then
    select id into v_program from public.programs where business_id = new.id and active;
    if v_program is not null then
      perform public.enqueue_job('wallet.sync_program', json_build_object('program_id', v_program)::jsonb, 'program:' || v_program, 5);
    end if;
  end if;
  return new;
end $$;
create trigger businesses_enqueue_sync after update on public.businesses
  for each row execute function public.businesses_enqueue_sync();

-- ─── Métricas ────────────────────────────────────────────────────────
create or replace function public.dashboard_stats(p_business_id uuid)
returns json language sql stable security definer set search_path = public as $$
  with b as (select timezone from public.businesses where id = p_business_id),
       today as (select (now() at time zone (select timezone from b))::date as d),
       p as (select id, stamps_required from public.programs where business_id = p_business_id and active)
  select json_build_object(
    'customers',          (select count(*) from public.customers where business_id = p_business_id),
    'rewards_ready',      (select count(*) from public.cards c, p where c.program_id = p.id and c.stamps >= p.stamps_required),
    'stamps_today',       (select coalesce(sum(stamps), 0) from public.daily_stats where business_id = p_business_id and day = (select d from today)),
    'visits_today',       (select coalesce(sum(visits), 0) from public.daily_stats where business_id = p_business_id and day = (select d from today)),
    'enrollments_month',  (select coalesce(sum(enrollments), 0) from public.daily_stats
                            where business_id = p_business_id and day >= date_trunc('month', (select d from today))::date),
    'redemptions_month',  (select coalesce(sum(redemptions), 0) from public.daily_stats
                            where business_id = p_business_id and day >= date_trunc('month', (select d from today))::date),
    'returning_rate',     (select case when count(*) filter (where visits >= 1) = 0 then 0
                                       else round(100.0 * count(*) filter (where visits >= 2) / count(*) filter (where visits >= 1)) end
                             from public.cards c, p where c.program_id = p.id)
  );
$$;

create or replace function public.report_daily(p_business_id uuid, p_from date, p_to date, p_location_id uuid default null)
returns table (day date, stamps int, redemptions int, enrollments int, visits int)
language sql stable security definer set search_path = public as $$
  select g.d::date,
         coalesce(sum(s.stamps), 0)::int,
         coalesce(sum(s.redemptions), 0)::int,
         coalesce(sum(s.enrollments), 0)::int,
         coalesce(sum(s.visits), 0)::int
    from generate_series(p_from, p_to, interval '1 day') g(d)
    left join public.daily_stats s
      on s.business_id = p_business_id and s.day = g.d::date
     and (p_location_id is null or s.location_id = p_location_id)
   group by g.d
   order by g.d;
$$;

create or replace function public.report_staff(p_business_id uuid, p_from timestamptz, p_to timestamptz)
returns table (membership_id uuid, name text, stamps int, redemptions int, undos int)
language sql stable security definer set search_path = public as $$
  select e.membership_id,
         coalesce(nullif(m.name, ''), 'Sin nombre'),
         coalesce(sum(e.delta) filter (where e.kind = 'stamp'), 0)::int,
         count(*) filter (where e.kind = 'redeem')::int,
         count(*) filter (where e.kind = 'undo')::int
    from public.card_events e
    left join public.memberships m on m.id = e.membership_id
   where e.business_id = p_business_id and e.created_at >= p_from and e.created_at < p_to
     and e.kind in ('stamp','redeem','undo')
   group by e.membership_id, m.name
   order by 3 desc;
$$;
