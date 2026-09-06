import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { estadoComprobanteDisplay, type Cliente, type Comprobante, type Gasto } from "@/lib/types";

export async function GET() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: clientesRaw }, { data: comprobantesRaw }, { data: gastosRaw }] = await Promise.all([
    supabase.from("core_clientes").select("*").order("nombre"),
    supabase
      .from("core_comprobantes")
      .select("*, core_clientes(nombre, nombre_comercial)")
      .order("fecha_emision"),
    supabase.from("core_gastos").select("*").order("fecha"),
  ]);

  const clientes = (clientesRaw ?? []) as Cliente[];
  type ComprobanteConCliente = Comprobante & {
    core_clientes: { nombre: string; nombre_comercial: string | null } | null;
  };
  const comprobantes = (comprobantesRaw ?? []) as ComprobanteConCliente[];
  const gastos = (gastosRaw ?? []) as Gasto[];

  const totalesPorCliente = new Map<string, { facturado: number; cobrado: number }>();
  for (const c of comprobantes) {
    if (c.estado_pago === "anulado") continue;
    const acc = totalesPorCliente.get(c.cliente_id) ?? { facturado: 0, cobrado: 0 };
    acc.facturado += c.total;
    if (c.estado_pago === "cobrado") acc.cobrado += c.total;
    totalesPorCliente.set(c.cliente_id, acc);
  }

  const hojaClientes = clientes.map((c) => {
    const t = totalesPorCliente.get(c.id) ?? { facturado: 0, cobrado: 0 };
    return {
      Cliente: c.nombre_comercial || c.nombre,
      "Razón social": c.nombre,
      "Tipo doc.": c.tipo_documento,
      "N° documento": c.numero_documento,
      Distrito: c.distrito ?? "",
      Contacto: c.contacto_nombre ?? "",
      Teléfono: c.contacto_telefono ?? "",
      Correo: c.contacto_correo ?? "",
      Estado: c.estado,
      "Fecha de alta": c.fecha_alta,
      "Facturado acumulado": t.facturado,
      Cobrado: t.cobrado,
      "Por cobrar": t.facturado - t.cobrado,
    };
  });

  // Estructura tipo Registro de Ventas e Ingresos de SUNAT, para que tu
  // contador la use como respaldo — esto no reemplaza ni genera el libro
  // electrónico (PLE), solo organiza lo ya registrado en Nexa Core.
  const hojaIngresos = comprobantes.map((c, i) => ({
    Correlativo: i + 1,
    "Fecha de emisión": c.fecha_emision,
    "Fecha de vencimiento": c.fecha_vencimiento ?? "",
    "Tipo comprobante": c.tipo,
    "Serie-número": c.serie_numero ?? "",
    Cliente: c.core_clientes?.nombre_comercial || c.core_clientes?.nombre || "",
    "Base imponible": c.subtotal,
    IGV: c.igv,
    Total: c.total,
    Estado: estadoComprobanteDisplay(c),
    "Medio de pago": c.medio_pago ?? "",
    "Fecha de cobro": c.fecha_cobro ?? "",
  }));

  const hojaGastos = gastos.map((g) => ({
    Fecha: g.fecha,
    Concepto: g.concepto,
    Proveedor: g.proveedor ?? "",
    Categoría: g.categoria,
    Frecuencia: g.frecuencia,
    Monto: g.monto,
    "Medio de pago": g.medio_pago ?? "",
  }));

  const resumenPorMes = new Map<string, { ingresos: number; gastos: number }>();
  for (const c of comprobantes) {
    if (c.estado_pago === "anulado") continue;
    const key = c.fecha_emision.slice(0, 7);
    const acc = resumenPorMes.get(key) ?? { ingresos: 0, gastos: 0 };
    acc.ingresos += c.total;
    resumenPorMes.set(key, acc);
  }
  for (const g of gastos) {
    const key = g.fecha.slice(0, 7);
    const acc = resumenPorMes.get(key) ?? { ingresos: 0, gastos: 0 };
    acc.gastos += g.monto;
    resumenPorMes.set(key, acc);
  }
  const hojaResumen = [...resumenPorMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({
      Mes: mes,
      Ingresos: v.ingresos,
      Gastos: v.gastos,
      Utilidad: v.ingresos - v.gastos,
    }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(hojaClientes), "Clientes");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(hojaIngresos), "Ingresos");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(hojaGastos), "Gastos");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(hojaResumen), "Resumen mensual");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const fecha = new Date().toISOString().slice(0, 10);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="nexa-core-reporte-${fecha}.xlsx"`,
    },
  });
}
