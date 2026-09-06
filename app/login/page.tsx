import SubmitButton from "@/components/SubmitButton";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-nexa-navy via-nexa-navy-soft to-nexa-blue px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <span
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[9px] text-xl font-extrabold text-white"
            style={{ background: "linear-gradient(140deg, #29B6F6, #0B6CFF)" }}
          >
            N
          </span>
          <h1 className="text-2xl font-bold text-white">Nexa Core</h1>
          <p className="mt-1 text-sm text-blue-100/80">Gestión interna — NEXA CONSULTING TI S.A.C.</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 shadow">{error}</div>
        )}

        <form
          action={signIn}
          className="space-y-3 rounded-xl border border-white/20 bg-white p-5 shadow-xl shadow-nexa-navy/20"
        >
          <h2 className="text-sm font-medium text-slate-700">Iniciar sesión</h2>
          <input
            name="email"
            type="email"
            required
            placeholder="correo@nexa.com"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Contraseña"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
          />
          <SubmitButton
            variant="primary"
            pendingLabel="Entrando..."
            className="w-full rounded-md px-3 py-2 text-sm font-medium"
          >
            Entrar
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
