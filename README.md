# Ya Merito · v2

Tarjetas de sellos para **Apple Wallet** y **Google Wallet**, como servicio para muchos negocios (SaaS).
El negocio se registra solo, diseña su tarjeta, imprime su cartel QR e invita a sus cajeros. Sus clientes
sacan la tarjeta con el QR, el cajero sella desde el celular y **el pase se actualiza solo en la wallet**.

Stack: Next.js 16 (App Router, Server Actions) · Supabase (Postgres, Auth, Storage) · Tailwind 4 · zod ·
passkit-generator · Google Wallet API · Mercado Pago Suscripciones · sharp.

---

## Qué cambió respecto a la v1

| Área | v1 (MVP) | v2 |
|---|---|---|
| Diseño | Crema y tarjetas | Blanco luminoso, tinta índigo y un solo acento (el sello). Nuevo logo. Panel con barra lateral y, en celular, barra inferior con el botón de sello al centro |
| Negocios | Uno, creado a mano | Registro self-serve con 14 días de prueba del plan Pro y tarjeta sugerida según el giro |
| Equipo | Solo el dueño | Dueño, gerente y cajero. Invitaciones por enlace (WhatsApp), cajeros fijos a una sucursal |
| Sucursales | No | Sí, con límite por plan. Cada sello guarda dónde se dio |
| Sellos | Tabla de sellos y de canjes | **Libro de movimientos** (`card_events`) que nunca se edita, más resumen diario por trigger |
| Wallet | Push directo después de sellar | **Cola con reintentos** (patrón outbox): el sello y su actualización se guardan en la misma transacción |
| Imágenes | Una por pase | **Compartidas y en caché**: una tarjeta de 8 sellos tiene 9 imágenes posibles para todos sus clientes |
| Cobro | Tabla vacía | Mercado Pago Suscripciones: checkout, webhook firmado e idempotente, periodo de gracia |
| Reportes | 4 números | Tablero, visitas por día, por cajero, por sucursal, exportación CSV |
| Código | Rutas con lógica mezclada | Capas: `core` (reglas puras) → `server/services` (casos de uso) → `app` (pantallas y rutas delgadas) |
| Pruebas | Manuales | 16 pruebas automáticas (`npm test`) + SQL probado en Postgres 16 |

---

## Arquitectura

```
                         ┌────────────────────────── Next.js ──────────────────────────┐
 Navegador / Wallet ───► │ app/            pantallas, rutas API delgadas, proxy.ts       │
                         │   │                                                            │
                         │   ▼                                                            │
                         │ server/actions  Server Actions: validan sesión → llaman servicio│
                         │ server/services casos de uso: caja, alta, equipo, diseño,      │
                         │                 reportes, cobro                                │
                         │   │         │                                                  │
                         │   ▼         ▼                                                  │
                         │ core/       server/integrations  Apple · Google · Mercado Pago │
                         │ reglas      server/jobs          cola: worker + handlers       │
                         │ puras       server/repos         lecturas compartidas          │
                         └───────────────────────┬────────────────────────────────────────┘
                                                 ▼
                         ┌──────────────── Supabase Postgres ──────────────────┐
                         │ RLS por negocio · funciones atómicas · cola (jobs)  │
                         │ libro card_events → trigger → daily_stats           │
                         └─────────────────────────────────────────────────────┘
```

**Reglas de la casa**

1. **`src/core` no conoce la base de datos ni la red.** Planes, precios, estado de la tarjeta, validación
   (zod), teléfonos, textos y arte SVG. Todo lo que es regla de negocio vive aquí y tiene pruebas.
2. **Leer con la sesión del usuario, escribir con funciones SQL.** El panel lee con RLS (`dbAsUser()`), así que
   un error en una consulta no puede mostrar datos de otro negocio. Las escrituras de sellos pasan por funciones
   `security definer` que solo el servidor puede ejecutar.
3. **Outbox.** `add_stamps`, `redeem_reward` y `undo_last_stamp` encolan `wallet.sync_card` dentro de la misma
   transacción. Si Apple o Google fallan, la cola reintenta con espera exponencial (30 s → 1 h, 8 intentos).
   La clave de deduplicación hace que 5 sellos seguidos generen una sola actualización.
4. **Un solo lugar para el modelo de negocio:** `src/core/plans.ts` (precios, límites, funciones por plan y
   reglas de acceso). La página de precios, el panel y el cobro leen de ahí.

### Flujo de un sello

```
Cajero escanea → stampAction → services/counter.stamp
  → assertCanOperate (plan vigente)
  → rpc add_stamps: bloquea la tarjeta (for update), valida, suma, escribe card_events,
                    encola wallet.sync_card   ← todo en una transacción
  → kickQueue(): after() procesa la cola sin hacer esperar al cajero
       → Apple: push vacío a APNs (HTTP/2, una conexión para muchos pases)
         → el iPhone pide GET /api/apple/v1/passes/… y recibe el pase nuevo
       → Google: PATCH al objeto; si se completó la tarjeta, aviso visible
  → /api/jobs/run (cada minuto) reintenta lo que falló
```

### Cómo escala

| Pieza | Por qué aguanta |
|---|---|
| Sellos simultáneos | Bloqueo por fila de tarjeta; dos cajeros no pierden sellos ni se bloquean entre tarjetas |
| Tablero | Lee `daily_stats` (una fila por negocio, día y sucursal), no recorre el libro |
| Cambio de diseño con 50,000 clientes | `wallet.sync_program` procesa de 500 en 500 y se re-encola con cursor |
| Imágenes de pases | Caché LRU por diseño + sellos; en Google la imagen es una URL compartida cacheada un año en la CDN |
| Varios workers | `claim_jobs` usa `for update skip locked`; trabajos colgados se recuperan a los 5 minutos |
| Alta pública | Límite por IP en Postgres (`rate_limit_hit`), campo trampa para bots |
| Búsqueda de clientes | Índice trigram en nombre; teléfono único por negocio |

Cuándo cambiar piezas: con más de ~200 sellos por segundo sostenidos, mueve la cola a un servicio dedicado
(Inngest, QStash o Supabase Queues) sin tocar los servicios: solo cambia `server/jobs/queue.ts`. Con decenas
de millones de movimientos, particiona `card_events` por mes.

---

## Estructura

```
src/
  core/                 reglas puras + pruebas (plans, loyalty, schemas, stamp-art, phone, text, errors)
  server/
    auth/session.ts     sesión, negocio activo, sucursal, permisos por rol
    actions/            Server Actions (account, counter, panel)
    services/           account, enrollment, counter, design, team, customers, reports, billing
    integrations/       apple (pase, APNs) · google (wallet) · billing (Mercado Pago, firma) · images
    jobs/               queue (worker) · handlers (wallet.sync_card, wallet.sync_program)
    repos/cards.ts      lectura de tarjeta + programa + negocio + cliente en una consulta
  features/             componentes interactivos (caja, editor de tarjeta, equipo, precios…)
  ui/                   sistema visual: botones, formularios, pase, gráficas, avisos
  app/
    (sitio)/            portada, precios, demo
    (cuenta)/           entrar, registro, recuperar, invitación
    panel/              inicio, sellar, clientes, tarjeta, cartel QR, reportes, equipo, negocio, plan
    u/[slug]            alta del cliente      c/[serial]   tarjeta del cliente
    api/                apple (web service PassKit), wallet, strip, jobs, billing, panel
supabase/migrations/    0001 negocios · 0002 tarjetas y libro · 0003 cobro y cola · 0004 operaciones · 0005 seguridad · 0006 storage y reloj
```

---

## Arranque local

```bash
npm install
cp .env.example .env.local      # llena al menos las 3 variables de Supabase
npm test                        # pruebas del núcleo (no necesitan base de datos)
npm run dev                     # http://localhost:3000 y /demo funcionan sin base de datos
```

### 1. Supabase

1. Crea un proyecto y copia `Project URL`, `anon key` y `service_role key` a `.env.local`.
2. Ejecuta las migraciones en orden (SQL Editor, o `supabase link` + `supabase db push`):
   `0001_tenants.sql` → `0006_storage_cron.sql`.
3. Entra a `/registro` y crea tu negocio, o usa el script:
   ```bash
   npm run seed        # tu usuario y tu negocio
   npm run seed:demo   # además 40 clientes con visitas de 30 días, para ver el panel lleno
   ```
4. En Authentication → URL Configuration agrega `https://TU-DOMINIO/auth/callback` (recuperar contraseña).

### 2. Reloj de la cola

La app procesa la cola en cuanto sellas. Para reintentos, programa `/api/jobs/run` cada minuto:

- **Supabase pg_cron** (gratis, recomendado): activa `pg_cron` y `pg_net`, y ejecuta el bloque comentado de
  `0006_storage_cron.sql` con tu dominio y tu `CRON_SECRET`.
- **Vercel Cron**: `vercel.json` trae una corrida diaria de respaldo (lo que permite el plan gratuito).
  En Vercel Pro cambia el horario a `* * * * *`.

### 3. Apple Wallet

Necesitas la cuenta de Apple Developer Program (99 USD al año, una sola para todos tus negocios).

1. developer.apple.com → Identifiers → **Pass Type IDs** → `pass.mx.yamerito.sellos`.
2. Llave y solicitud:
   ```bash
   mkdir certs && cd certs
   openssl req -new -newkey rsa:2048 -keyout signerKey.pem -out pass.csr -subj "/emailAddress=tu@correo.com/CN=Ya Merito/C=MX"
   ```
3. En el Pass Type ID → Create Certificate → sube `pass.csr` → descarga `pass.cer`:
   `openssl x509 -inform der -in pass.cer -out signerCert.pem`
4. Descarga **Apple WWDR G4** y conviértelo: `openssl x509 -inform der -in AppleWWDRCAG4.cer -out wwdr.pem`
5. `npm run certs:base64 -- certs/wwdr.pem certs/signerCert.pem certs/signerKey.pem` y pega el resultado.

El iPhone solo registra el pase para actualizaciones si `NEXT_PUBLIC_APP_URL` es HTTPS público. Los errores
del iPhone llegan a `/api/apple/v1/log` (búscalos en los logs como `[apple-wallet]`).

### 4. Google Wallet

1. Google Pay & Wallet Console → crea tu emisor → `GOOGLE_WALLET_ISSUER_ID`.
2. Google Cloud → habilita Google Wallet API → cuenta de servicio → llave JSON.
3. En la consola de Wallet invita el correo de la cuenta de servicio.
4. `base64 -i cuenta.json | tr -d '\n'` → `GOOGLE_WALLET_SA_JSON_BASE64`.
5. En modo demo solo tus cuentas de prueba pueden guardar pases; pide acceso de publicación cuando el piloto funcione.

### 5. Mercado Pago (suscripciones)

1. Tus integraciones → crea una aplicación → Credenciales de producción → `MP_ACCESS_TOKEN`.
2. Webhooks → URL `https://TU-DOMINIO/api/billing/mercadopago` → eventos **Planes y suscripciones**
   (`subscription_preapproval` y `subscription_authorized_payment`) → copia la clave secreta a `MP_WEBHOOK_SECRET`.
3. Prueba con usuarios de prueba de Mercado Pago antes de cobrar de verdad.

El dueño elige plan en `/panel/plan`, autoriza el cobro en Mercado Pago y regresa. El webhook (firmado y sin
procesar dos veces el mismo aviso) activa el plan. Si un cobro falla hay **5 días de gracia**; si cancela, el
plan sigue hasta el fin del periodo pagado. Para usar Stripe, implementa `BillingProvider`
(`server/integrations/billing/provider.ts`) y cámbialo en `services/billing.ts`.

### 6. Publicar en Vercel

Importa el repositorio, copia las variables (menos las `SEED_*`) y fija `NEXT_PUBLIC_APP_URL` a tu dominio
final antes del primer cliente: los pases instalados guardan esa dirección.

---

## Antes de lanzar

- Cambia los botones de `/c/[serial]` por los **badges oficiales** “Add to Apple Wallet” y “Add to Google Wallet”
  (sus guías de marca lo exigen).
- Aviso de privacidad (LFPDPPP): la página de alta recoge nombre y celular.
- Decide si tus precios incluyen IVA y si vas a facturar (CFDI). Los precios viven en `src/core/plans.ts`.
- Prueba el ciclo completo en un iPhone y un Android reales.

## Qué se probó aquí y qué no

Probado: las 6 migraciones en Postgres 16 con una imitación de Supabase (registro con slug repetido,
premio sugerido por giro, alta idempotente, sellos, doble sello, máximo por visita, tope, deshacer, canje,
deshacer después de canje, aislamiento entre negocios, cola con deduplicación, reintentos y "superseded",
límite de peticiones, invitaciones, RLS de dueño/cajero/otro negocio); un `.pkpass` firmado real con el código
v2 (firma válida, caché de imágenes); 16 pruebas del núcleo y de la firma de Mercado Pago; revisión de tipos de
los 97 archivos de `src/`.

No probado aquí (no había acceso a npm): `npm install`, `npm run build`, el render de las pantallas en el
navegador y las llamadas reales a Apple, Google y Mercado Pago.

## Siguientes pasos

1. Verificación del celular por WhatsApp al darse de alta.
2. Mensajes a clientes (campañas): “te extrañamos”, cumpleaños, promociones por sucursal.
3. Varios programas por negocio (por ejemplo, café y comida).
4. Integraciones con puntos de venta para sellar y descontar el premio en automático.
5. Programa de revendedores (agencias que venden Ya Merito a sus clientes).
