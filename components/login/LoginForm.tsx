import SubmitButton from "@/components/SubmitButton";
import PasswordInput from "@/components/login/PasswordInput";
import { MailIcon } from "@/components/icons";
import { signIn } from "@/app/login/actions";

// No mostramos el mensaje de Supabase tal cual (puede traer detalles
// técnicos) — cualquier error de inicio de sesión se muestra con este
// mismo texto genérico. La lógica de auth (app/login/actions.ts) no se
// toca: esto es solo cómo se presenta su resultado.
const ERROR_MESSAGE = "No pudimos iniciar sesión. Verifica tu correo y contraseña.";

export default function LoginForm({ error }: { error?: string }) {
  const describedBy = error ? "login-error" : undefined;

  return (
    <div className="flex w-full flex-1 flex-col justify-start px-6 pb-12 pt-16 sm:px-10 sm:pt-20 md:justify-center md:px-12 md:pt-0 lg:px-16">
      <div className="mx-auto w-full max-w-[440px]">
        {/* Identidad compacta — solo en mobile/tablet chico, donde el panel de marca está oculto */}
        <div className="mb-8 flex items-center gap-3 md:hidden">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] text-base font-extrabold tracking-tight text-white"
            style={{ background: "linear-gradient(140deg, #29B6F6, #0B6CFF)" }}
          >
            N
          </span>
          <p className="text-[15px] font-bold tracking-wide text-nexa-navy">NEXA CORE</p>
        </div>

        <h2 className="text-[22px] font-bold tracking-tight text-nexa-navy">Bienvenido a Nexa Core</h2>
        <p className="mt-1.5 text-[13.5px] text-nexa-topbar-muted">Ingresa tus credenciales para continuar.</p>

        {error && (
          <div
            id="login-error"
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-[10px] border border-red-100 bg-red-50/80 px-3.5 py-3 text-[13px] text-red-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 8v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="12" cy="16" r="0.9" fill="currentColor" />
            </svg>
            <span>{ERROR_MESSAGE}</span>
          </div>
        )}

        <form action={signIn} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-nexa-topbar-text">
              Correo electrónico
            </label>
            <div className="relative">
              <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                aria-invalid={!!error || undefined}
                aria-describedby={describedBy}
                placeholder="nombre@nexaconsultingti.com"
                className={`h-12 w-full rounded-[10px] border bg-white pl-10 pr-3 text-[14.5px] text-nexa-navy outline-none transition-colors duration-200 placeholder:text-slate-400 ${
                  error
                    ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    : "border-slate-300 focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
                }`}
              />
            </div>
          </div>

          <PasswordInput
            label="Contraseña"
            name="password"
            autoComplete="current-password"
            invalid={!!error}
            describedBy={describedBy}
          />

          <SubmitButton
            variant="primary"
            pendingLabel="Iniciando sesión..."
            className="mt-2 h-12 w-full rounded-[10px] text-[14.5px] font-semibold"
          >
            Iniciar sesión
          </SubmitButton>
        </form>

        <div className="mt-8 space-y-1 border-t border-nexa-border pt-5">
          <p className="text-[12px] text-nexa-topbar-muted">
            Acceso exclusivo para colaboradores autorizados de NEXA.
          </p>
          <p className="text-[11px] font-medium text-slate-400">NEXA CONSULTING TI S.A.C.</p>
        </div>
      </div>
    </div>
  );
}
