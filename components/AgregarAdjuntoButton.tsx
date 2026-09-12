"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { agregarAdjuntoComprobante } from "@/app/(app)/ingresos/actions";

export default function AgregarAdjuntoButton({ comprobanteId }: { comprobanteId: string }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    setError(null);

    const supabase = createClient();
    const key = `comprobantes/${comprobanteId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("core-adjuntos").upload(key, file);

    if (uploadError) {
      setSubiendo(false);
      setError(uploadError.message);
      return;
    }

    try {
      await agregarAdjuntoComprobante(comprobanteId, key, file.name);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el adjunto.");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <span className="inline-flex items-center">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        onChange={onChange}
        className="hidden"
        id={`adjunto-${comprobanteId}`}
      />
      <label
        htmlFor={`adjunto-${comprobanteId}`}
        className="cursor-pointer rounded-md px-2 py-1 text-[12px] font-semibold text-nexa-blue hover:bg-nexa-light"
      >
        {subiendo ? "Subiendo..." : "+ Adjuntar"}
      </label>
      {error && <span className="ml-1 text-[11px] text-red-600">{error}</span>}
    </span>
  );
}
