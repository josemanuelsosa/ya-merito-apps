-- ════════════════════════════════════════════════════════════════════
--  Ya Merito v2 · 0002 · Programas, clientes, tarjetas y libro de movimientos
--  card_events es un libro contable: nunca se edita ni se borra.
--  Las tarjetas guardan el saldo para leerlo rápido.
-- ════════════════════════════════════════════════════════════════════

-- ─── Programas (diseño de la tarjeta + regla del premio) ─────────────
create table public.programs (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses(id) on delete cascade,
  name                text not null default 'Tarjeta de sellos' check (char_length(name) between 2 and 40),
  stamps_required     int  not null default 8 check (stamps_required between 2 and 20),
  reward_description  text not null check (char_length(reward_description) between 2 and 80),
  terms               text check (char_length(terms) <= 400),
  background_color    text not null default '#17152B' check (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  foreground_color    text not null default '#FFFFFF' check (foreground_color ~ '^#[0-9A-Fa-f]{6}$'),
  label_color         text not null default '#FF8A1F' check (label_color ~ '^#[0-9A-Fa-f]{6}$'),
  stamp_icon          text not null default 'check' check (stamp_icon in ('check','star','heart','cup','scissors','taco')),
  -- Evita el doble sello por doble toque del cajero
  min_seconds_between_stamps int not null default 30 check (min_seconds_between_stamps between 0 and 3600),
  max_stamps_per_visit       int not null default 3  check (max_stamps_per_visit between 1 and 10),
  active              boolean not null default true,
  google_class_id     text unique,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index programs_one_active on public.programs(business_id) where active;
create trigger programs_touch before update on public.programs
  for each row execute function public.touch_updated_at();

-- ─── Clientes finales (por negocio) ──────────────────────────────────
create table public.customers (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 60),
  phone             text not null check (phone ~ '^[0-9]{10,15}$'),
  first_location_id uuid references public.locations(id) on delete set null,
  marketing_opt_in  boolean not null default false,
  last_visit_at     timestamptz,
  created_at        timestamptz not null default now(),
  unique (business_id, phone)
);
create index customers_business_recent_idx on public.customers(business_id, created_at desc);
create index customers_name_trgm_idx on public.customers using gin (name gin_trgm_ops);

-- ─── Tarjetas (una por cliente por programa) ─────────────────────────
create table public.cards (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  program_id        uuid not null references public.programs(id) on delete cascade,
  customer_id       uuid not null references public.customers(id) on delete cascade,
  serial_number     text not null unique default gen_random_uuid()::text,
  auth_token        text not null default replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
  stamps            int  not null default 0 check (stamps >= 0),
  lifetime_stamps   int  not null default 0,
  visits            int  not null default 0,
  redemptions       int  not null default 0,
  last_stamp_at     timestamptz,
  google_object_id  text unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (program_id, customer_id)
);
create index cards_business_activity_idx on public.cards(business_id, updated_at desc);
create index cards_program_serial_idx on public.cards(program_id, serial_number);
create trigger cards_touch before update on public.cards
  for each row execute function public.touch_updated_at();

-- ─── Libro de movimientos ────────────────────────────────────────────
create table public.card_events (
  id               bigint generated always as identity primary key,
  business_id      uuid not null references public.businesses(id) on delete cascade,
  card_id          uuid not null references public.cards(id) on delete cascade,
  location_id      uuid references public.locations(id) on delete set null,
  membership_id    uuid references public.memberships(id) on delete set null,
  kind             text not null check (kind in ('enroll','stamp','redeem','undo','adjust')),
  -- cambio en el saldo de sellos (+ sello, − canje/deshacer)
  delta            int  not null default 0,
  stamps_after     int  not null,
  reward_description text,
  ticket_ref       text check (char_length(ticket_ref) <= 40),
  reverts_event_id bigint unique references public.card_events(id),
  created_at       timestamptz not null default now()
);
create index card_events_card_idx     on public.card_events(card_id, created_at desc);
create index card_events_business_idx on public.card_events(business_id, created_at desc);
create index card_events_member_idx   on public.card_events(business_id, membership_id, created_at desc);

-- ─── Resumen diario (lo llena un trigger; el tablero lee de aquí) ─────
create table public.daily_stats (
  business_id  uuid not null references public.businesses(id) on delete cascade,
  day          date not null,
  location_id  uuid not null default '00000000-0000-0000-0000-000000000000',
  stamps       int  not null default 0,
  redemptions  int  not null default 0,
  enrollments  int  not null default 0,
  visits       int  not null default 0,
  primary key (business_id, day, location_id)
);

create or replace function public.card_events_rollup()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tz  text;
  v_day date;
begin
  select timezone into v_tz from public.businesses where id = new.business_id;
  v_day := (new.created_at at time zone coalesce(v_tz, 'America/Mexico_City'))::date;

  insert into public.daily_stats as d (business_id, day, location_id, stamps, redemptions, enrollments, visits)
  values (
    new.business_id, v_day, coalesce(new.location_id, '00000000-0000-0000-0000-000000000000'),
    case when new.kind in ('stamp','undo','adjust') then new.delta else 0 end,
    case when new.kind = 'redeem' then 1 else 0 end,
    case when new.kind = 'enroll' then 1 else 0 end,
    case when new.kind = 'stamp' then 1 when new.kind = 'undo' then -1 else 0 end
  )
  on conflict (business_id, day, location_id) do update set
    stamps      = d.stamps + excluded.stamps,
    redemptions = d.redemptions + excluded.redemptions,
    enrollments = d.enrollments + excluded.enrollments,
    visits      = d.visits + excluded.visits;
  return new;
end $$;

create trigger card_events_rollup after insert on public.card_events
  for each row execute function public.card_events_rollup();

-- ─── Apple Wallet: dispositivos registrados (web service de PassKit) ──
create table public.apple_devices (
  device_library_identifier text primary key,
  push_token                text not null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create trigger apple_devices_touch before update on public.apple_devices
  for each row execute function public.touch_updated_at();

create table public.apple_registrations (
  device_library_identifier text not null references public.apple_devices(device_library_identifier) on delete cascade,
  pass_type_identifier      text not null,
  serial_number             text not null references public.cards(serial_number) on delete cascade,
  created_at                timestamptz not null default now(),
  primary key (device_library_identifier, pass_type_identifier, serial_number)
);
create index apple_registrations_serial_idx on public.apple_registrations(serial_number);
