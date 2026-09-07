// Funcion programada de Netlify: corre todos los dias, revisa el
// cronograma de vencimientos SUNAT (lib/sunat.ts) y manda un correo de
// aviso al admin cuando faltan 5, 2 o 0 dias para la fecha limite.
// No presenta ni envia nada a SUNAT — es solo un recordatorio por correo.
//
// Requiere en las variables de entorno de Netlify: SUPABASE_SERVICE_ROLE_KEY
// y RESEND_API_KEY (ademas de las NEXT_PUBLIC_SUPABASE_* ya configuradas).
//
// Para probarla localmente hace falta Netlify CLI (`netlify dev`), que no
// esta instalado en este entorno — se puede invocar a mano desde el
// dashboard de Netlify ("Trigger function") una vez desplegada.

import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { proximoVencimiento, nombrePeriodo } from "../../lib/sunat";

const DIAS_DE_AVISO = [5, 2, 0];

function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !url) {
    throw new Error("Faltan SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL.");
  }
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

const recordatorioSunat = async () => {
  const supabase = createAdminClient();
  const hoy = new Date();

  const { data: config } = await supabase.from("core_configuracion").select("ruc").eq("id", true).single();
  if (!config) {
    console.warn("core_configuracion sin fila — no se puede calcular el cronograma.");
    return new Response("sin configuracion", { status: 200 });
  }

  const vencimiento = proximoVencimiento(hoy, config.ruc);
  if (!vencimiento || vencimiento.vencido) {
    return new Response("sin vencimiento proximo en el cronograma cargado", { status: 200 });
  }

  const diasRestantes = Math.round(
    (new Date(vencimiento.fecha).getTime() - new Date(hoy.toISOString().slice(0, 10)).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (!DIAS_DE_AVISO.includes(diasRestantes)) {
    return new Response(`faltan ${diasRestantes} dias, no toca avisar hoy`, { status: 200 });
  }

  // Evita reenviar el mismo aviso si la funcion corre mas de una vez el mismo dia.
  const { data: yaEnviado } = await supabase
    .from("core_recordatorios_sunat_enviados")
    .select("periodo")
    .eq("periodo", vencimiento.periodo)
    .eq("dias_antes", diasRestantes)
    .maybeSingle();

  if (yaEnviado) {
    return new Response("recordatorio ya enviado", { status: 200 });
  }

  const { data: admins } = await supabase.from("profiles").select("email").eq("role", "admin");
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey && admins && admins.length > 0) {
    const resend = new Resend(apiKey);
    const periodoLabel = nombrePeriodo(vencimiento.periodo);
    const fechaLegible = vencimiento.fecha.split("-").reverse().join("/");

    await Promise.all(
      admins.map((a) =>
        resend.emails.send({
          from: "Nexa Core <notificaciones@nexaconsultingti.com>",
          to: a.email,
          subject: `Recordatorio SUNAT: declaración de ${periodoLabel} (${fechaLegible})`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <p>Hola,</p>
              <p>Tu declaración mensual de IGV-Renta de <strong>${periodoLabel}</strong> vence el <strong>${fechaLegible}</strong>.</p>
              <p>${diasRestantes === 0 ? "Vence <strong>hoy</strong>." : `Faltan <strong>${diasRestantes} día${diasRestantes === 1 ? "" : "s"}</strong>.`}</p>
              <p>Revisa el estimado de IGV y Renta en el Panel de Nexa Core antes de declarar en SUNAT Operaciones en Línea.</p>
              <p style="color: #888; font-size: 12px; margin-top: 24px;">
                Nexa Core no presenta la declaración por ti — este correo es solo un recordatorio.
              </p>
            </div>
          `,
        }),
      ),
    );
  } else if (!apiKey) {
    console.warn("RESEND_API_KEY no configurada — no se envió el recordatorio SUNAT.");
  }

  await supabase
    .from("core_recordatorios_sunat_enviados")
    .insert({ periodo: vencimiento.periodo, dias_antes: diasRestantes });

  return new Response("recordatorio enviado", { status: 200 });
};

export default recordatorioSunat;

export const config: Config = {
  // Todos los dias a las 13:00 UTC = 8:00 a.m. hora de Lima.
  schedule: "0 13 * * *",
};
