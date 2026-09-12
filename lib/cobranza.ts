// Fecha del proximo cobro recurrente de un cliente, a partir del dia del
// mes configurado en core_clientes.dia_cobro. Si ese dia ya paso este mes,
// cae en el mes siguiente. Si el mes no tiene ese dia (ej. 31 en febrero),
// se ajusta al ultimo dia del mes.
export function proximoCobro(diaCobro: number, hoy: Date = new Date()): string {
  const intentar = (year: number, month: number) => {
    const ultimoDiaDelMes = new Date(year, month + 1, 0).getDate();
    const dia = Math.min(diaCobro, ultimoDiaDelMes);
    return new Date(year, month, dia);
  };

  const hoyISO = hoy.toISOString().slice(0, 10);
  let candidato = intentar(hoy.getFullYear(), hoy.getMonth());
  if (candidato.toISOString().slice(0, 10) < hoyISO) {
    candidato = intentar(hoy.getFullYear(), hoy.getMonth() + 1);
  }
  return candidato.toISOString().slice(0, 10);
}

export function diasHasta(fechaISO: string, hoy: Date = new Date()): number {
  const hoyISO = hoy.toISOString().slice(0, 10);
  return Math.round(
    (new Date(fechaISO).getTime() - new Date(hoyISO).getTime()) / (1000 * 60 * 60 * 24),
  );
}
