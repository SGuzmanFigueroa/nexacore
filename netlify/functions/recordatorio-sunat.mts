// Funcion programada de Netlify: corre todos los dias, revisa AMBOS
// cronogramas de vencimientos SUNAT (lib/sunatCalendar.ts) -- Registros
// SIRE y Formulario Virtual 621 -- y manda un correo de aviso al admin por
// cada uno cuando faltan 5, 2 o 0 dias para su fecha limite y todavia no
// fue marcado como resuelto en core_obligaciones_sunat.
// No presenta ni envia nada a SUNAT -- es solo un recordatorio por correo.
//
// Requiere en las variables de entorno de Netlify: SUPABASE_SERVICE_ROLE_KEY
// y RESEND_API_KEY (ademas de las NEXT_PUBLIC_SUPABASE_* ya configuradas).
//
// Para probarla localmente hace falta Netlify CLI (`netlify dev`), que no
// esta instalado en este entorno -- se puede invocar a mano desde el
// dashboard de Netlify ("Trigger function") una vez desplegada.

import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getSunatDeadline, nombrePeriodo } from "../../lib/sunatCalendar";
import { obligacionCumplida, type ObligacionSunatTipo } from "../../lib/types";

const DIAS_DE_AVISO = [5, 2, 0];

const TIPO_LABEL: Record<ObligacionSunatTipo, string> = {
  sire: "Registros SIRE (Registro de Ventas/Compras)",
  fv621: "declaración de IGV-Renta (Formulario Virtual 621)",
};

function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !url) {
    throw new Error("Faltan SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL.");
  }
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function avisarObligacion(
  supabase: ReturnType<typeof createAdminClient>,
  tipo: ObligacionSunatTipo,
  periodo: string,
  fecha: string,
  hoy: Date,
  admins: { email: string }[],
  apiKey: string | undefined,
) {
  const diasRestantes = Math.round(
    (new Date(fecha).getTime() - new Date(hoy.toISOString().slice(0, 10)).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (!DIAS_DE_AVISO.includes(diasRestantes)) return `faltan ${diasRestantes} dias, no toca avisar hoy`;

  const { data: obligacion } = await supabase
    .from("core_obligaciones_sunat")
    .select("estado")
    .eq("periodo", periodo)
    .eq("tipo", tipo)
    .maybeSingle();

  if (obligacion && obligacionCumplida(obligacion.estado)) {
    return "obligacion ya marcada como resuelta, no se avisa";
  }

  const { data: yaEnviado } = await supabase
    .from("core_recordatorios_sunat_enviados")
    .select("periodo")
    .eq("periodo", periodo)
    .eq("tipo", tipo)
    .eq("dias_antes", diasRestantes)
    .maybeSingle();

  if (yaEnviado) return "recordatorio ya enviado";

  const periodoLabel = nombrePeriodo(periodo);
  const fechaLegible = fecha.split("-").reverse().join("/");

  if (apiKey && admins.length > 0) {
    const resend = new Resend(apiKey);
    await Promise.all(
      admins.map((a) =>
        resend.emails.send({
          from: "Nexa Core <notificaciones@nexaconsultingti.com>",
          to: a.email,
          subject: `Recordatorio SUNAT: ${TIPO_LABEL[tipo]} de ${periodoLabel} (${fechaLegible})`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <p>Hola,</p>
              <p>Tu ${TIPO_LABEL[tipo]} de <strong>${periodoLabel}</strong> vence el <strong>${fechaLegible}</strong>.</p>
              <p>${diasRestantes === 0 ? "Vence <strong>hoy</strong>." : `Faltan <strong>${diasRestantes} día${diasRestantes === 1 ? "" : "s"}</strong>.`}</p>
              <p>Revisa el estimado de IGV y Renta en el Panel de Nexa Core antes de declarar en SUNAT Operaciones en Línea.</p>
              <p style="color: #888; font-size: 12px; margin-top: 24px;">
                Nexa Core no presenta ni paga esta obligación por ti — este correo es solo un recordatorio.
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
    .insert({ periodo, tipo, dias_antes: diasRestantes });

  return "recordatorio enviado";
}

const recordatorioSunat = async () => {
  const supabase = createAdminClient();
  const hoy = new Date();

  const { data: config } = await supabase.from("core_configuracion").select("ruc").eq("id", true).single();
  if (!config) {
    console.warn("core_configuracion sin fila — no se puede calcular el cronograma.");
    return new Response("sin configuracion", { status: 200 });
  }

  // Período que corresponde declarar ahora: el mes anterior al actual
  // (todo período se declara/paga el mes siguiente a que cierra).
  const periodo = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString().slice(0, 7);

  const { data: admins } = await supabase.from("profiles").select("email").eq("role", "admin");
  const apiKey = process.env.RESEND_API_KEY;

  const resultados: string[] = [];
  for (const tipo of ["sire", "fv621"] as ObligacionSunatTipo[]) {
    const fecha = getSunatDeadline(periodo, config.ruc, tipo);
    if (!fecha) {
      resultados.push(`${tipo}: sin cronograma cargado para ${periodo}`);
      continue;
    }
    resultados.push(`${tipo}: ${await avisarObligacion(supabase, tipo, periodo, fecha, hoy, admins ?? [], apiKey)}`);
  }

  return new Response(resultados.join(" | "), { status: 200 });
};

export default recordatorioSunat;

export const config: Config = {
  // Todos los dias a las 13:00 UTC = 8:00 a.m. hora de Lima.
  schedule: "0 13 * * *",
};
