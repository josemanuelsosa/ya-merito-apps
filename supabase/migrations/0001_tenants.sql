-- ════════════════════════════════════════════════════════════════════
--  Ya Merito v2 · 0001 · Negocios, sucursales, equipo
--  Cada negocio es un "tenant". Todo dato de negocio lleva business_id.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pg_trgm;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─── Negocios ────────────────────────────────────────────────────────
create table public.businesses (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique
              check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 48),
  name        text not null check (char_length(name) between 2 and 60),
  category    text not null default 'otro'
              check (category in ('cafeteria','restaurante','taqueria','panaderia','barberia','estetica','tienda','otro')),
  logo_url    text,
  phone       text,
  address     text,
  timezone    text not null default 'America/Mexico_City',
  status      text not null default 'active' check (status in ('active','suspended','deleted')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger businesses_touch before update on public.businesses
  for each row execute function public.touch_updated_at();

-- ─── Sucursales ──────────────────────────────────────────────────────
create table public.locations (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 60),
  address     text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index locations_business_idx on public.locations(business_id) where active;

-- ─── Equipo (dueño, gerente, cajero) ─────────────────────────────────
create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default '' check (char_length(name) <= 60),
  role        text not null check (role in ('owner','manager','cashier')),
  -- null = puede operar en todas las sucursales
  location_id uuid references public.locations(id) on delete set null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (business_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id) where active;

-- ─── Invitaciones al equipo (enlace con token; se guarda solo el hash) ─
create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  role        text not null check (role in ('manager','cashier')),
  location_id uuid references public.locations(id) on delete set null,
  name        text,
  token_hash  text not null unique,
  invited_by  uuid references public.memberships(id) on delete set null,
  expires_at  timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index invitations_business_idx on public.invitations(business_id, created_at desc);
