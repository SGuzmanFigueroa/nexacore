export default function ProximamenteCard({ fase, detalle }: { fase: string; detalle: string }) {
  return (
    <div className="m-7 rounded-[14px] border border-nexa-border bg-white p-8 text-center">
      <p className="text-sm font-bold text-nexa-navy">Disponible en {fase}</p>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] text-nexa-topbar-muted">{detalle}</p>
    </div>
  );
}
