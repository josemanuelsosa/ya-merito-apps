-- ════════════════════════════════════════════════════════════════════
--  Ya Merito v3 · 0007 · Estudio de mercado
--  Todo se calcula sobre datos que ya existen (cards, card_events,
--  daily_stats). Solo el comparativo por giro guarda un resumen diario.
--  Las reglas de segmentos están espejeadas en src/core/insights.ts.
-- ════════════════════════════════════════════════════════════════════

-- ─── Segmentos de clientes (una sola pasada por las tarjetas) ─────────
-- Ciclo de vida (cada cliente cae en uno):
--   nuevo      tarjeta de los últimos 30 días
--   frecuente  vino en los últimos 30 días y lleva 4 visitas o más
--   ocasional  vino en los últimos 30 días, menos de 4 visitas
--   en_riesgo  su última visita fue hace 30 a 90 días
--   perdido    no viene hace más de 90 días, o nunca selló
-- Listas para actuar (se pueden repetir entre sí):
--   casi       le falta 1 sello
--   premio     tiene su premio listo
--   una_visita vino una sola vez, hace 14 a 90 días
create or replace function public.insights_segments(p_business_id uuid)
returns json language sql stable security definer set search_path = public as $$
  with p as (select id, stamps_required as r from public.programs where business_id = p_business_id and active)
  select json_build_object(
    'total',      count(k.id),
    'nuevo',      count(k.id) filter (where k.created_at >= now() - interval '30 days'),
    'frecuente',  count(k.id) filter (where k.created_at < now() - interval '30 days'
                                         and k.last_stamp_at >= now() - interval '30 days' and k.visits >= 4),
    'ocasional',  count(k.id) filter (where k.created_at < now() - interval '30 days'
                                         and k.last_stamp_at >= now() - interval '30 days' and k.visits < 4),
    'en_riesgo',  count(k.id) filter (where k.created_at < now() - interval '30 days'
                                         and k.last_stamp_at < now() - interval '30 days'
                                         and k.last_stamp_at >= now() - interval '90 days'),
    'perdido',    count(k.id) filter (where k.created_at < now() - interval '30 days'
                                         and (k.last_stamp_at is null or k.last_stamp_at < now() - interval '90 days')),
    'casi',       count(k.id) filter (where p.r >= 2 and k.stamps = p.r - 1),
    'premio',     count(k.id) filter (where k.stamps >= p.r),
    'una_visita', count(k.id) filter (where k.visits = 1 and k.last_stamp_at < now() - interval '14 days'
                                         and k.last_stamp_at >= now() - interval '90 days'),
    'con_visita', count(k.id) filter (where k.visits >= 1),
    'regresan',   count(k.id) filter (where k.visits >= 2),
    'activos_30d', count(k.id) filter (where k.last_stamp_at >= now() - interval '30 days'),
    -- Días entre visitas: (última visita − alta) / (visitas − 1). La alta casi
    -- siempre es la primera visita, así que no hace falta leer el libro.
    'dias_entre_visitas', round((percentile_cont(0.5) within group (
        order by extract(epoch from (k.last_stamp_at - k.created_at)) / 86400.0 / greatest(k.visits - 1, 1))
        filter (where k.visits >= 2 and k.last_stamp_at >= now() - interval '180 days'))::numeric, 1),
    'visitas_30d', (select coalesce(sum(s.visits), 0) from public.daily_stats s
                     where s.business_id = p_business_id and s.day >= (now() - interval '30 days')::date)
  )
  from p left join public.cards k on k.program_id = p.id;
$$;

-- ─── Horas pico: visitas por día de la semana y hora (hora local) ─────
-- dow: 0 = lunes … 6 = domingo. Excluye sellos que se deshicieron.
create or replace function public.insights_heatmap(p_business_id uuid, p_days int default 90)
returns table (dow int, hour int, visits int)
language sql stable security definer set search_path = public as $$
  with b as (select timezone as tz from public.businesses where id = p_business_id)
  select (extract(isodow from e.created_at at time zone b.tz)::int - 1) as dow,
         extract(hour from e.created_at at time zone b.tz)::int as hour,
         count(*)::int as visits
    from public.card_events e, b
   where e.business_id = p_business_id
     and e.kind = 'stamp'
     and e.created_at >= now() - make_interval(days => least(greatest(p_days, 7), 365))
     and not exists (select 1 from public.card_events u where u.reverts_event_id = e.id)
   group by 1, 2;
$$;

-- ─── Retención por mes de alta (cohortes) ─────────────────────────────
-- Por cada mes de alta: cuántos sacaron tarjeta y cuántos de ellos sellaron
-- en el mes 0, 1, 2… después. month_offset null = cohorte sin sellos.
create or replace function public.insights_cohorts(p_business_id uuid, p_months int default 6)
returns table (cohort date, size int, month_offset int, active int)
language sql stable security definer set search_path = public as $$
  with b as (select timezone as tz from public.businesses where id = p_business_id),
  p as (select id from public.programs where business_id = p_business_id and active),
  c as (
    select k.id, date_trunc('month', k.created_at at time zone b.tz)::date as cohort
      from public.cards k, b, p
     where k.program_id = p.id
       and k.created_at >= (date_trunc('month', now() at time zone b.tz)
                            - make_interval(months => least(greatest(p_months, 1), 12) - 1)) at time zone b.tz
  ),
  sizes as (select cohort, count(*)::int as size from c group by cohort),
  act as (
    select c.cohort,
           ((extract(year from e.created_at at time zone b.tz) * 12 + extract(month from e.created_at at time zone b.tz))
            - (extract(year from c.cohort) * 12 + extract(month from c.cohort)))::int as month_offset,
           count(distinct c.id)::int as active
      from c
      join public.card_events e on e.card_id = c.id and e.kind = 'stamp', b
     group by 1, 2
  )
  select s.cohort, s.size, a.month_offset, coalesce(a.active, 0)
    from sizes s left join act a on a.cohort = s.cohort
   order by s.cohort, a.month_offset;
$$;

-- ─── Comparativo por giro (resumen diario, anónimo) ───────────────────
-- Medianas de negocios del mismo giro con al menos 20 clientes. Solo se
-- publica un giro con 5 negocios o más, para que nadie se pueda identificar.
create table public.category_benchmarks (
  category                text primary key,
  businesses              int not null,
  returning_rate          numeric,   -- % de clientes con 2+ visitas
  visits_per_active       numeric,   -- visitas en 30 días por cliente activo
  days_between_visits     numeric,
  enrollments_30d         numeric,
  computed_at             timestamptz not null default now()
);

create table public.maintenance_runs (
  task    text primary key,
  ran_at  timestamptz not null
);

alter table public.category_benchmarks enable row level security;
alter table public.maintenance_runs    enable row level security;
-- Sin políticas: solo el servidor las lee.

create or replace function public.refresh_benchmarks(p_min_businesses int default 5, p_min_customers int default 20)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from public.category_benchmarks;

  with per_business as (
    select b.id, b.category,
           count(k.id) as customers,
           100.0 * count(k.id) filter (where k.visits >= 2) / nullif(count(k.id) filter (where k.visits >= 1), 0) as returning_rate,
           (select coalesce(sum(s.visits), 0) from public.daily_stats s
             where s.business_id = b.id and s.day >= (now() - interval '30 days')::date)::numeric
             / nullif(count(k.id) filter (where k.last_stamp_at >= now() - interval '30 days'), 0) as visits_per_active,
           percentile_cont(0.5) within group (
             order by extract(epoch from (k.last_stamp_at - k.created_at)) / 86400.0 / greatest(k.visits - 1, 1))
             filter (where k.visits >= 2 and k.last_stamp_at >= now() - interval '180 days') as days_between_visits,
           count(k.id) filter (where k.created_at >= now() - interval '30 days') as enrollments_30d
      from public.businesses b
      join public.programs p on p.business_id = b.id and p.active
      left join public.cards k on k.program_id = p.id
     where b.status = 'active'
     group by b.id, b.category
  )
  insert into public.category_benchmarks (category, businesses, returning_rate, visits_per_active, days_between_visits, enrollments_30d, computed_at)
  select category, count(*),
         round((percentile_cont(0.5) within group (order by returning_rate))::numeric, 1),
         round((percentile_cont(0.5) within group (order by visits_per_active))::numeric, 2),
         round((percentile_cont(0.5) within group (order by days_between_visits))::numeric, 1),
         round((percentile_cont(0.5) within group (order by enrollments_30d))::numeric, 1),
         now()
    from per_business
   where customers >= p_min_customers
   group by category
  having count(*) >= p_min_businesses;

  get diagnostics n = row_count;
  insert into public.maintenance_runs (task, ran_at) values ('benchmarks', now())
  on conflict (task) do update set ran_at = excluded.ran_at;
  return n;
end $$;

-- Lo llama /api/jobs/run cada minuto; solo recalcula una vez cada 20 horas.
create or replace function public.refresh_benchmarks_if_stale()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.maintenance_runs where task = 'benchmarks' and ran_at > now() - interval '20 hours') then
    return false;
  end if;
  -- Evita que dos workers lo corran a la vez
  if not pg_try_advisory_xact_lock(hashtext('ya-merito-benchmarks')) then
    return false;
  end if;
  perform public.refresh_benchmarks();
  return true;
end $$;

-- ─── Comparativo entre sucursales (plan Cadena) ───────────────────────
create or replace function public.insights_locations(p_business_id uuid, p_days int default 30)
returns table (location_id uuid, name text, visits int, stamps int, redemptions int, enrollments int)
language sql stable security definer set search_path = public as $$
  select l.id, l.name,
         coalesce(sum(s.visits), 0)::int,
         coalesce(sum(s.stamps), 0)::int,
         coalesce(sum(s.redemptions), 0)::int,
         coalesce(sum(s.enrollments), 0)::int
    from public.locations l
    left join public.daily_stats s
      on s.business_id = l.business_id and s.location_id = l.id
     and s.day >= (now() - make_interval(days => least(greatest(p_days, 7), 365)))::date
   where l.business_id = p_business_id and l.active
   group by l.id, l.name
   order by 3 desc, l.name;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.insights_segments(uuid)',
    'public.insights_heatmap(uuid, int)',
    'public.insights_cohorts(uuid, int)',
    'public.refresh_benchmarks(int, int)',
    'public.refresh_benchmarks_if_stale()',
    'public.insights_locations(uuid, int)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
