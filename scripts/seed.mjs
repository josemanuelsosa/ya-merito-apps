// Crea tu primer negocio (y opcionalmente datos de ejemplo para ver el panel lleno).
//   npm run seed         → usuario dueño + negocio (igual que registrarse en /registro)
//   npm run seed:demo    → además 40 clientes con visitas de los últimos 30 días
// Lee .env.local (SEED_EMAIL, SEED_PASSWORD, SEED_NEGOCIO, SEED_GIRO, SEED_NOMBRE).
import { createClient } from "@supabase/supabase-js";

const env = process.env;
const demo = process.argv.includes("--demo");
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SEED_EMAIL || !env.SEED_PASSWORD) {
  console.error("Faltan variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_EMAIL, SEED_PASSWORD");
  process.exit(1);
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const negocio = env.SEED_NEGOCIO ?? "Café La Esquina";
const slug = negocio
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

async function main() {
  // 1. Usuario
  let userId;
  const created = await db.auth.admin.createUser({
    email: env.SEED_EMAIL,
    password: env.SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { name: env.SEED_NOMBRE ?? "" },
  });
  if (created.error) {
    const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
    userId = data?.users.find((u) => u.email?.toLowerCase() === env.SEED_EMAIL.toLowerCase())?.id;
    if (!userId) throw created.error;
    console.log("• El usuario ya existía:", env.SEED_EMAIL);
  } else {
    userId = created.data.user.id;
    console.log("• Usuario creado:", env.SEED_EMAIL);
  }

  // 2. Negocio (si el usuario aún no tiene uno)
  const { data: mine } = await db.from("memberships").select("business_id").eq("user_id", userId).limit(1);
  let businessId = mine?.[0]?.business_id;
  if (!businessId) {
    const { data, error } = await db.rpc("create_business", {
      p_user_id: userId,
      p_owner_name: env.SEED_NOMBRE ?? "",
      p_name: negocio,
      p_slug: slug,
      p_category: env.SEED_GIRO ?? "cafeteria",
      p_trial_days: 14,
    });
    if (error) throw error;
    businessId = data.id;
    console.log(`• Negocio creado: ${data.name} (/u/${data.slug}) con 14 días de prueba`);
  } else {
    console.log("• El usuario ya tiene negocio");
  }

  if (demo) await seedDemo(businessId);
  console.log(`\n✓ Listo. Entra a ${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login con ${env.SEED_EMAIL}`);
}

/** Clientes y visitas de ejemplo con fechas pasadas (para ver reportes y gráficas). */
async function seedDemo(businessId) {
  const NAMES = ["Ana López", "Carlos Méndez", "María Fernanda Ruiz", "José Luis Garza", "Sofía Treviño", "Diego Salinas", "Valeria Cantú", "Luis Ángel Rdz", "Fernanda Villarreal", "Jorge Elizondo", "Mariana Garza", "Ricardo Leal", "Daniela Peña", "Emilio Zambrano", "Paola Cavazos", "Andrés Montemayor", "Regina Benavides", "Héctor Tamez", "Camila Sada", "Óscar Guajardo"];
  const { data: program } = await db.from("programs").select("*").eq("business_id", businessId).eq("active", true).single();
  const { data: loc } = await db.from("locations").select("id").eq("business_id", businessId).limit(1).single();
  const { data: member } = await db.from("memberships").select("id").eq("business_id", businessId).limit(1).single();
  const day = 86_400_000;
  let total = 0;

  for (let i = 0; i < 40; i++) {
    const name = `${NAMES[i % NAMES.length]}${i >= NAMES.length ? " (2)" : ""}`;
    const phone = `81${String(10000000 + i * 7919).slice(0, 8)}`;
    const { data: r, error } = await db.rpc("enroll_customer", { p_business_id: businessId, p_name: name, p_phone: phone, p_location_id: loc.id });
    if (error) throw error;
    if (!r.created) continue;
    const { data: card } = await db.from("cards").select("*").eq("serial_number", r.serial).single();

    // Visitas en fechas pasadas: se insertan directo en el libro (el trigger arma el resumen diario)
    const visits = Math.floor(Math.random() * 12);
    let stamps = 0, lifetime = 0, redemptions = 0, last = null;
    const start = Date.now() - 30 * day;
    const events = [];
    for (let v = 0; v < visits; v++) {
      const at = new Date(start + Math.random() * 30 * day);
      events.push(at);
    }
    events.sort((a, b) => a - b);
    for (const at of events) {
      stamps += 1;
      lifetime += 1;
      last = at.toISOString();
      await db.from("card_events").insert({ business_id: businessId, card_id: card.id, location_id: loc.id, membership_id: member.id, kind: "stamp", delta: 1, stamps_after: stamps, created_at: last });
      if (stamps >= program.stamps_required && Math.random() < 0.7) {
        stamps -= program.stamps_required;
        redemptions += 1;
        await db.from("card_events").insert({ business_id: businessId, card_id: card.id, location_id: loc.id, membership_id: member.id, kind: "redeem", delta: -program.stamps_required, stamps_after: stamps, reward_description: program.reward_description, created_at: new Date(at.getTime() + 60_000).toISOString() });
      }
    }
    await db.from("cards").update({ stamps, lifetime_stamps: lifetime, visits, redemptions, last_stamp_at: last }).eq("id", card.id);
    if (last) await db.from("customers").update({ last_visit_at: last }).eq("id", card.customer_id);
    total += visits;
  }
  // Las tarjetas de ejemplo no están en ninguna wallet: se vacía la cola que generaron
  await db.from("jobs").delete().eq("status", "pending").like("dedupe_key", "card:%");
  console.log(`• Datos de ejemplo: 40 clientes y ${total} visitas en los últimos 30 días`);
}

main().catch((e) => {
  console.error("✗", e.message ?? e);
  process.exit(1);
});
