"use client";

import { useRouter } from "next/navigation";

export default function SunatAnioSelector({ anio, anios }: { anio: string; anios: string[] }) {
  const router = useRouter();

  return (
    <select
      value={anio}
      onChange={(e) => router.push(`/sunat?anio=${e.target.value}`)}
      className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-nexa-navy outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
    >
      {anios.map((a) => (
        <option key={a} value={a}>
          {a}
        </option>
      ))}
    </select>
  );
}
