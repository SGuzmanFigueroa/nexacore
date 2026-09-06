export default function BarrasIngresosGastos({
  data,
}: {
  data: { label: string; ingresos: number; gastos: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.ingresos, d.gastos)));

  return (
    <div className="flex h-40 items-end gap-6 px-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-32 w-full items-end justify-center gap-1.5">
            <div
              className="w-4 rounded-t-[3px] bg-nexa-blue"
              style={{ height: `${(d.ingresos / max) * 100}%` }}
              title={`Ingresos: ${d.ingresos.toFixed(2)}`}
            />
            <div
              className="w-4 rounded-t-[3px] bg-nexa-alert/70"
              style={{ height: `${(d.gastos / max) * 100}%` }}
              title={`Gastos: ${d.gastos.toFixed(2)}`}
            />
          </div>
          <span className="text-[11px] font-medium text-nexa-topbar-muted">{d.label}</span>
        </div>
      ))}
      <div className="ml-2 flex shrink-0 flex-col gap-1.5 self-start pt-1 text-[11px] font-medium text-nexa-topbar-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-nexa-blue" /> Ingresos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-nexa-alert/70" /> Gastos
        </span>
      </div>
    </div>
  );
}
