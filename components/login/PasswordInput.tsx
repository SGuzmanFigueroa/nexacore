"use client";

import { useId, useState } from "react";
import { EyeIcon, EyeOffIcon, LockIcon } from "@/components/icons";

export default function PasswordInput({
  label,
  name,
  autoComplete,
  invalid,
  describedBy,
}: {
  label: string;
  name: string;
  autoComplete: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-nexa-topbar-text">
        {label}
      </label>
      <div className="relative">
        <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          placeholder="••••••••"
          className={`h-12 w-full rounded-[10px] border bg-white pl-10 pr-11 text-[14.5px] text-nexa-navy outline-none transition-colors duration-200 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 ${
            invalid
              ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
              : "border-slate-300 focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors duration-150 hover:text-nexa-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexa-blue/30"
        >
          {visible ? <EyeOffIcon className="h-[18px] w-[18px]" /> : <EyeIcon className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </div>
  );
}
