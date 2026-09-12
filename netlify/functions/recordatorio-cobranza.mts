// Funcion programada de Netlify: corre a diario, revisa los clientes con
// cobro recurrente (core_clientes.dia_cobro) y manda un correo de aviso al
// admin el dia que toca cobrarles (o si ya paso y sigue sin registrarse un
// comprobante ese mes). No emite ni cobra nada — es solo un recordatorio.
//
// Requiere en las variables de entorno de Netlify: SUPABASE_SERVICE_ROLE_KEY
// y RESEND_API_KEY (ademas de las NEXT_PUBLIC_SUPABASE_* ya configuradas).

import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !url) {
    throw new Error("Faltan SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL.");
  }
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Misma logica que lib/cobranza.ts (duplicada: la funcion de Netlify se
// empaqueta aparte del bundle de Next y no resuelve el alias @/).
function proximoCobro(diaCobro: number, hoy: Date): string {
  const intentar = (year: number, month: number) => {
    const ultimoDiaDelMes = new Date(year, month + 1, 0).getDate();
    const dia = Math.min(diaCobro, ultimoDiaDelMes);
    return new Date(year, month, dia);
  };
  const hoyISO = hoy.toISOString().slice(0, 10);
  let candidato = intentar(hoy.getFullYear(), hoy.getMonth());
  if (candidato.toISOString().slice(0, 10) < hoyISO) {
    candidato = intentar(hoy.getFullYear(), hoy.getMonth() + 1);
  }
  return candidato.toISOString().slice(0, 10);
}

const recordatorioCobranza = async () => {
  const supabase = createAdminClient();
  const hoy = new Date();
  const hoyISO = hoy.toISOString().slice(0, 10);

  const { data: clientes } = await supabase
    .from("core_clientes")
    .select("id, nombre, nombre_comercial, dia_cobro")
    .not("dia_cobro", "is", null)
    .in("estado", ["activo", "piloto"]);

  if (!clientes || clientes.length === 0) {
    return new Response("sin clientes con cobro recurrente", { status: 200 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const { data: admins } = await supabase.from("profiles").select("email").eq("role", "admin");

  const avisos: { cliente: string; periodo: string; fecha: string }[] = [];

  for (const cliente of clientes) {
    const fecha = proximoCobro(cliente.dia_cobro as number, hoy);
    if (fecha !== hoyISO) continue; // solo avisa el dia exacto

    const periodo = hoyISO.slice(0, 7);
    const { data: yaEnviado } = await supabase
      .from("core_recordatorios_cobranza_enviados")
      .select("cliente_id")
      .eq("cliente_id", cliente.id)
      .eq("periodo", periodo)
      .maybeSingle();

    if (yaEnviado) continue;

    avisos.push({
      cliente: cliente.nombre_comercial || cliente.nombre,
      periodo,
      fecha,
    });

    await supabase
      .from("core_recordatorios_cobranza_enviados")
      .insert({ cliente_id: cliente.id, periodo });
  }

  if (avisos.length === 0) {
    return new Response("nadie que cobrar hoy", { status: 200 });
  }

  if (apiKey && admins && admins.length > 0) {
    const resend = new Resend(apiKey);
    const lista = avisos.map((a) => `<li>${a.cliente}</li>`).join("");

    await Promise.all(
      admins.map((a) =>
        resend.emails.send({
          from: "Nexa Core <notificaciones@nexaconsultingti.com>",
          to: a.email,
          subject: `Hoy toca cobrar a ${avisos.length} cliente${avisos.length === 1 ? "" : "s"}`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <p>Hola,</p>
              <p>Según el día de cobro configurado, hoy corresponde facturar/cobrar a:</p>
              <ul>${lista}</ul>
              <p style="color: #888; font-size: 12px; margin-top: 24px;">
                Nexa Core no cobra por ti — este correo es solo un recordatorio.
              </p>
            </div>
          `,
        }),
      ),
    );
  } else if (!apiKey) {
    console.warn("RESEND_API_KEY no configurada — no se envió el recordatorio de cobranza.");
  }

  return new Response(`recordatorio enviado (${avisos.length} clientes)`, { status: 200 });
};

export default recordatorioCobranza;

export const config: Config = {
  // Todos los dias a las 13:00 UTC = 8:00 a.m. hora de Lima.
  schedule: "0 13 * * *",
};
