"use client";

import { useState } from "react";
import { signOut } from "@/app/login/actions";
import type { Profile } from "@/lib/types";
import NavLink from "./NavLink";
import {
  PanelIcon,
  ClientesIcon,
  IngresosIcon,
  GastosIcon,
  CobranzasIcon,
  ReportesIcon,
  ConfiguracionIcon,
} from "./icons";

export default function Sidebar({
  profile,
  clientesCount,
  cobranzasPendientes,
}: {
  profile: Profile;
  clientesCount: number;
  cobranzasPendientes: number;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const initials = (profile.full_name ?? profile.email).slice(0, 2).toUpperCase();

  return (
    <>
      {/* Barra superior en móvil */}
      <div className="flex items-center justify-between bg-nexa-navy px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-extrabold text-white"
            style={{ background: "linear-gradient(140deg, #29B6F6, #0B6CFF)" }}
          >
            N
          </span>
          <p className="text-sm font-semibold text-white">Nexa Core</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="rounded-md p-2 text-white hover:bg-white/10"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 5h14M3 10h14M3 15h14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[236px] shrink-0 flex-col bg-nexa-navy py-6 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-[10px] px-5 pb-[26px]">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-[16px] font-extrabold tracking-tight text-white"
            style={{ background: "linear-gradient(140deg, #29B6F6, #0B6CFF)" }}
          >
            N
          </span>
          <div className="flex min-w-0 flex-col gap-px">
            <p className="truncate text-sm font-bold tracking-wide text-white">NEXA CORE</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-nexa-sidebar-text-muted">
              Gestión interna
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-3">
          <p className="px-[10px] pb-1.5 pt-2 text-[10px] font-bold tracking-widest text-nexa-sidebar-heading">
            GENERAL
          </p>
          <NavLink href="/panel" icon={<PanelIcon />} onNavigate={close}>
            Panel
          </NavLink>
          <NavLink href="/clientes" icon={<ClientesIcon />} badge={clientesCount} onNavigate={close}>
            Clientes
          </NavLink>
          <NavLink href="/ingresos" icon={<IngresosIcon />} onNavigate={close}>
            Ingresos
          </NavLink>
          <NavLink href="/gastos" icon={<GastosIcon />} onNavigate={close}>
            Gastos
          </NavLink>
          <NavLink
            href="/ingresos?estado=pendiente"
            icon={<CobranzasIcon />}
            badge={cobranzasPendientes > 0 ? cobranzasPendientes : undefined}
            badgeAlert
            onNavigate={close}
          >
            Cobranzas
          </NavLink>

          <p className="px-[10px] pb-1.5 pt-[18px] text-[10px] font-bold tracking-widest text-nexa-sidebar-heading">
            OPERACIÓN
          </p>
          <NavLink href="/reportes" icon={<ReportesIcon />} onNavigate={close}>
            Reportes
          </NavLink>
          <NavLink href="/configuracion" icon={<ConfiguracionIcon />} onNavigate={close}>
            Configuración
          </NavLink>
        </nav>

        <div className="mt-auto px-[14px] pt-4">
          <div className="flex items-center gap-[10px] rounded-[11px] bg-nexa-navy-soft px-3 py-[11px]">
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-nexa-sky text-[11.5px] font-extrabold text-nexa-navy">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-bold text-white">
                {profile.full_name ?? profile.email}
              </p>
              <p className="text-[10.5px] font-medium text-nexa-sidebar-text-muted">
                Administrador
              </p>
            </div>
          </div>
          <form action={signOut} className="mt-1">
            <button
              type="submit"
              className="w-full rounded-md px-3 py-1.5 text-left text-[12px] text-nexa-sidebar-text-muted transition-colors hover:bg-white/5 hover:text-white"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
