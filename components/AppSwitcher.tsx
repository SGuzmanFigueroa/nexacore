"use client";

import { useEffect, useRef, useState } from "react";

// Apps de Nexa entre las que se puede saltar. Mantener igual en las 3 apps.
const NEXA_APPS = [
  {
    id: "equipo",
    name: "Equipo Nexa",
    description: "Integrantes del equipo",
    href: "https://equiponexa.netlify.app/dashboard",
    icon: (
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    ),
  },
  {
    id: "tickets",
    name: "Nexa Tracker",
    description: "Tickets y casos de prueba",
    href: "https://gestionticketsqa.netlify.app/dashboard",
    icon: (
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2ZM13 5v2M13 17v2M13 11v2" />
    ),
  },
  {
    id: "core",
    name: "Nexa Core",
    description: "Contabilidad de Nexa",
    href: "https://nexacoreinterno.netlify.app/panel",
    icon: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  },
] as const;

const CURRENT_APP = "core";

export default function AppSwitcher({
  buttonClassName = "text-slate-500 hover:bg-slate-200/60",
  panelAlign = "right",
}: {
  buttonClassName?: string;
  panelAlign?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Cambiar de aplicación"
        title="Apps de Nexa"
        className={`rounded-md p-2 transition-colors ${buttonClassName}`}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
          {[3, 9, 15].flatMap((y) => [3, 9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-50 mt-2 w-72 max-sm:fixed max-sm:inset-x-4 max-sm:top-14 max-sm:mt-0 max-sm:w-auto rounded-lg border border-slate-200 bg-white p-2 shadow-xl ${
            panelAlign === "right" ? "right-0" : "left-0"
          }`}
        >
          <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Apps de Nexa
          </p>
          <ul className="space-y-1">
            {NEXA_APPS.map((app) => {
              const current = app.id === CURRENT_APP;
              return (
                <li key={app.id}>
                  <a
                    href={app.href}
                    role="menuitem"
                    aria-current={current ? "page" : undefined}
                    onClick={(e) => {
                      if (current) {
                        e.preventDefault();
                        setOpen(false);
                      }
                    }}
                    className={`flex items-center gap-3 rounded-md px-2 py-2 transition-colors ${
                      current
                        ? "bg-nexa-light"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-nexa-sky to-nexa-blue text-white">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        {app.icon}
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-800">{app.name}</span>
                      <span className="block text-xs text-slate-500">{app.description}</span>
                    </span>
                    {current && (
                      <span className="shrink-0 text-[11px] font-medium text-nexa-blue">Estás aquí</span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
