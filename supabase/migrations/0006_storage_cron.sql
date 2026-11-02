-- ════════════════════════════════════════════════════════════════════
--  Ya Merito v2 · 0006 · Almacenamiento de logos y reloj de la cola
-- ════════════════════════════════════════════════════════════════════

-- Logos públicos (Apple y Google los descargan por URL). Sube el servidor.
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- ─── Reloj de la cola (opcional, recomendado) ────────────────────────
-- La app procesa la cola en cuanto sella (after()). Este reloj reintenta lo
-- que falló, cada minuto, sin depender del plan de Vercel.
-- 1) Activa las extensiones pg_cron y pg_net en Supabase (Database → Extensions).
-- 2) Cambia la URL y el secreto, y ejecuta:
--
-- select cron.schedule(
--   'ya-merito-cola',
--   '* * * * *',
--   $$ select net.http_get(
--        url := 'https://TU-DOMINIO/api/jobs/run',
--        headers := jsonb_build_object('authorization', 'Bearer TU_CRON_SECRET')
--      ) $$
-- );
