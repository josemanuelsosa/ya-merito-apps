-- ════════════════════════════════════════════════════════════════════
--  Ya Merito v2 · 0003 · Suscripciones, cola de trabajos y límites de uso
-- ════════════════════════════════════════════════════════════════════

-- ─── Suscripción del negocio (una por negocio) ───────────────────────
create table public.subscriptions (
  business_id              uuid primary key references public.businesses(id) on delete cascade,
  plan                     text not null default 'pro' check (plan in ('esencial','pro','cadena')),
  status                   text not null default 'trialing'
                           check (status in ('trialing','active','past_due','paused','canceled')),
  billing_cycle            text not null default 'monthly' check (billing_cycle in ('monthly','yearly')),
  trial_ends_at            timestamptz,
  current_period_end       timestamptz,
  provider                 text check (provider in ('mercadopago','stripe','manual')),
  provider_subscription_id text unique,
  provider_status          text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- Webhooks recibidos (idempotencia + auditoría)
create table public.billing_events (
  id           bigint generated always as identity primary key,
  provider     text not null,
  event_key    text not null,
  topic        text,
  payload      jsonb not null default '{}',
  processed_at timestamptz,
  error        text,
  created_at   timestamptz not null default now(),
  unique (provider, event_key)
);

-- ─── Cola de trabajos (patrón outbox) ────────────────────────────────
-- Las funciones de sellado insertan aquí EN LA MISMA transacción.
-- Así una actualización de wallet nunca se pierde aunque falle APNs o Google.
create table public.jobs (
  id           bigint generated always as identity primary key,
  type         text not null,
  payload      jsonb not null default '{}',
  status       text not null default 'pending' check (status in ('pending','running','done','dead')),
  attempts     int  not null default 0,
  max_attempts int  not null default 8,
  run_at       timestamptz not null default now(),
  locked_at    timestamptz,
  locked_by    text,
  last_error   text,
  dedupe_key   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- Un solo trabajo pendiente por clave: 5 sellos seguidos = 1 actualización
create unique index jobs_dedupe_pending on public.jobs(dedupe_key) where status = 'pending';
create index jobs_ready_idx on public.jobs(run_at) where status = 'pending';
create index jobs_running_idx on public.jobs(locked_at) where status = 'running';
create trigger jobs_touch before update on public.jobs
  for each row execute function public.touch_updated_at();

create or replace function public.enqueue_job(
  p_type text, p_payload jsonb, p_dedupe_key text default null, p_delay_seconds int default 0
) returns void language sql security definer set search_path = public as $$
  insert into public.jobs (type, payload, dedupe_key, run_at)
  values (p_type, coalesce(p_payload, '{}'), p_dedupe_key, now() + make_interval(secs => p_delay_seconds))
  on conflict (dedupe_key) where status = 'pending' do nothing;
$$;

-- Toma trabajos listos sin pisarse con otros workers (skip locked).
-- Los que se quedaron "running" más de 5 min (worker caído) se reintentan.
create or replace function public.claim_jobs(p_limit int, p_worker text)
returns setof public.jobs language sql security definer set search_path = public as $$
  update public.jobs j
     set status = 'running', locked_at = now(), locked_by = p_worker, attempts = j.attempts + 1
   where j.id in (
     select id from public.jobs
      where (status = 'pending' and run_at <= now())
         or (status = 'running' and locked_at < now() - interval '5 minutes')
      order by run_at
      limit p_limit
      for update skip locked
   )
  returning j.*;
$$;

create or replace function public.complete_job(p_id bigint)
returns void language sql security definer set search_path = public as $$
  update public.jobs set status = 'done', locked_at = null, last_error = null where id = p_id;
$$;

-- Reintento con espera exponencial: 30 s, 1 min, 2 min… hasta 1 h. Después: "dead".
create or replace function public.fail_job(p_id bigint, p_error text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.jobs;
begin
  select * into v from public.jobs where id = p_id for update;
  if not found then return; end if;
  if v.attempts >= v.max_attempts then
    update public.jobs set status = 'dead', locked_at = null, last_error = left(p_error, 2000) where id = p_id;
  else
    begin
      update public.jobs
         set status = 'pending', locked_at = null, last_error = left(p_error, 2000),
             run_at = now() + make_interval(secs => least(15 * power(2, v.attempts), 3600))
       where id = p_id;
    exception when unique_violation then
      -- ya hay otro pendiente con la misma clave: ese cubrirá este cambio
      update public.jobs set status = 'done', locked_at = null, last_error = 'superseded' where id = p_id;
    end;
  end if;
end $$;

create or replace function public.prune_jobs(p_keep_days int default 7)
returns int language sql security definer set search_path = public as $$
  with d as (
    delete from public.jobs where status = 'done' and updated_at < now() - make_interval(days => p_keep_days)
    returning 1
  ) select count(*)::int from d;
$$;

-- ─── Límite de peticiones (alta pública de clientes) ─────────────────
create table public.rate_limits (
  key          text primary key,
  window_start timestamptz not null,
  hits         int not null
);

create or replace function public.rate_limit_hit(p_key text, p_window_seconds int, p_max int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_hits int;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_max;
end $$;
