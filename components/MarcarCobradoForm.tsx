"use client";

import { useState } from "react";
import SubmitButton from "./SubmitButton";
import { MEDIO_PAGO_LABELS, type MedioPago } from "@/lib/types";

const MEDIOS_PAGO = Object.keys(MEDIO_PAGO_LABELS) as MedioPago[];

export default function MarcarCobradoForm({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md px-2 py-1 text-[12px] font-semibold text-nexa-positive hover:bg-nexa-positive/10"
      >
        Marcar cobrado
      </button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-1.5">
      <select
        name="medio_pago"
        required
        className="h-7 rounded-md border border-slate-300 px-1.5 text-[11.5px] outline-none focus:border-nexa-blue"
      >
        <option value="">Medio...</option>
        {MEDIOS_PAGO.map((m) => (
          <option key={m} value={m}>
            {MEDIO_PAGO_LABELS[m]}
          </option>
        ))}
      </select>
      <SubmitButton variant="primary" pendingLabel="..." className="rounded-md px-2 py-1 text-[11.5px] font-semibold">
        OK
      </SubmitButton>
    </form>
  );
}
