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

// El selector de fecha del formulario necesita una fecha completa para
// mostrar algo, aunque solo nos importe el dia (el cobro se repite cada
// mes). Devuelve ese dia dentro del mes actual (ajustado si el mes es mas
// corto), o "" si todavia no aplica — a diferencia de proximoCobro(), no
// salta al mes siguiente aunque el dia ya haya pasado, porque aqui solo
// es un valor de referencia para mostrar en el input, no una fecha real.
export function diaCobroAFecha(diaCobro: number | null, hoy: Date = new Date()): string {
  if (!diaCobro) return "";
  const ultimoDiaDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const dia = Math.min(diaCobro, ultimoDiaDelMes);
  return new Date(hoy.getFullYear(), hoy.getMonth(), dia).toISOString().slice(0, 10);
}

// Del valor de un <input type="date"> (YYYY-MM-DD) nos quedamos solo con
// el dia del mes — es lo unico que se guarda, el mes/año que haya elegido
// el usuario no importa.
export function fechaADiaCobro(fechaISO: string | null): number | null {
  if (!fechaISO) return null;
  const dia = Number(fechaISO.split("-")[2]);
  return Number.isInteger(dia) && dia >= 1 && dia <= 31 ? dia : null;
}
