// Panel de marca del login — puramente decorativo (server component, sin
// estado). Todo se construye con CSS/SVG, sin imágenes externas: gradientes
// radiales, una grilla casi imperceptible y una tarjeta abstracta que evoca
// (sin simularlo literalmente) un dashboard financiero.
export default function LoginBrandPanel() {
  return (
    <div
      className="relative hidden w-full shrink-0 overflow-hidden bg-nexa-navy md:flex md:w-[45%] md:flex-col lg:w-[58%]"
      aria-hidden="true"
    >
      {/* Profundidad: grilla tenue + halos de luz, todo con opacidad muy baja */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(var(--nexa-sky) 1px, transparent 1px), linear-gradient(90deg, var(--nexa-sky) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
        }}
      />
      <div
        className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--nexa-blue) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-16 h-[380px] w-[380px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--nexa-sky) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(160deg, transparent 0%, var(--nexa-navy-soft) 120%)" }}
      />

      {/* Contenido */}
      <div className="relative flex h-full flex-col justify-between px-12 py-12 lg:px-16 lg:py-14">
        <div className="motion-safe:animate-[login-fade-up_500ms_ease-out]">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-lg font-extrabold tracking-tight text-white"
              style={{ background: "linear-gradient(140deg, #29B6F6, #0B6CFF)" }}
            >
              N
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-[15px] font-bold tracking-wide text-white">NEXA CORE</p>
              <p className="text-[10.5px] font-medium uppercase tracking-wider text-nexa-sidebar-text-muted">
                Sistema interno
              </p>
            </div>
          </div>
        </div>

        <div className="motion-safe:animate-[login-fade-up_600ms_ease-out] max-w-md">
          <h1 className="text-[32px] font-bold leading-[1.15] tracking-tight text-white lg:text-[38px]">
            Control empresarial en un solo lugar.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-blue-100/75">
            Gestiona los movimientos y operaciones de NEXA desde una plataforma centralizada.
          </p>

          {/* Tarjeta abstracta de ambientación — no es un dashboard real */}
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
            <div className="flex items-end gap-2.5" style={{ height: 64 }}>
              {[38, 58, 46, 72, 54, 80, 64].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-[4px]"
                  style={{
                    height: `${h}%`,
                    background: "linear-gradient(180deg, var(--nexa-sky) 0%, var(--nexa-blue) 100%)",
                    opacity: 0.35 + i * 0.02,
                  }}
                />
              ))}
            </div>

            <svg viewBox="0 0 280 40" className="mt-4 h-8 w-full" preserveAspectRatio="none">
              <polyline
                points="0,30 40,22 80,26 120,12 160,18 200,6 240,14 280,4"
                fill="none"
                stroke="var(--nexa-sky)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.55"
              />
            </svg>

            <div className="mt-4 flex items-center gap-4 border-t border-white/10 pt-4">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--nexa-sky)" }} />
                <span className="h-1.5 w-10 rounded-full bg-white/15" />
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--nexa-blue)" }} />
                <span className="h-1.5 w-16 rounded-full bg-white/15" />
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                <span className="h-1.5 w-6 rounded-full bg-white/15" />
              </div>
            </div>
          </div>
        </div>

        <div className="motion-safe:animate-[login-fade-up_700ms_ease-out] text-[11.5px] font-medium tracking-wide text-nexa-sidebar-text-muted">
          NEXA CONSULTING TI S.A.C.
        </div>
      </div>
    </div>
  );
}
