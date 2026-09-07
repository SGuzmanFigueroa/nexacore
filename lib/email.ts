import "server-only";
import { Resend } from "resend";

const FROM_EMAIL = "Nexa Core <notificaciones@nexaconsultingti.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";

// Nunca lanza: un correo fallido no debe romper el cron que lo dispara.
export async function sendRecordatorioSunatEmail({
  to,
  periodoLabel,
  fecha,
  diasRestantes,
}: {
  to: string;
  periodoLabel: string;
  fecha: string;
  diasRestantes: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY no configurada — no se envió el recordatorio SUNAT.");
    return;
  }

  const cuando =
    diasRestantes === 0
      ? "Vence <strong>hoy</strong>"
      : `Vence en <strong>${diasRestantes} día${diasRestantes === 1 ? "" : "s"}</strong>`;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Recordatorio SUNAT: declaración de ${periodoLabel} (${fecha})`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <p>Hola,</p>
          <p>Tu declaración mensual de IGV-Renta de <strong>${periodoLabel}</strong> vence el <strong>${fecha}</strong>.</p>
          <p>${cuando}. Revisa el estimado en Nexa Core antes de declarar en SUNAT Operaciones en Línea.</p>
          <p>
            <a href="${SITE_URL}/panel" style="background: #0A1F44; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none;">
              Ver estimado en el Panel
            </a>
          </p>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">
            Nexa Core no presenta la declaración por ti — este correo es solo un recordatorio.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Error enviando recordatorio SUNAT:", err);
  }
}
