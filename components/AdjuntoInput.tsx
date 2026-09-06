"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdjuntoInput({ label = "Adjunto (PDF o imagen, opcional)" }: { label?: string }) {
  const [path, setPath] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    setError(null);

    const supabase = createClient();
    const key = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("core-adjuntos").upload(key, file);

    setSubiendo(false);
    if (uploadError) {
      setError(uploadError.message);
      return;
    }
    setPath(key);
    setNombre(file.name);
  }

  return (
    <div className="col-span-2">
      <label className="text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">{label}</label>
      <input type="hidden" name="url_adjunto" value={path ?? ""} />
      <input
        type="file"
        accept="application/pdf,image/*"
        onChange={onChange}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-nexa-light file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-nexa-blue"
      />
      {subiendo && <p className="mt-1 text-xs text-nexa-topbar-muted">Subiendo...</p>}
      {nombre && !subiendo && <p className="mt-1 text-xs text-nexa-positive">Adjunto: {nombre}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
