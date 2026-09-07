import "server-only";
import type { ComprobanteTipo } from "./types";

// Integracion con Nubefact (OSE de facturacion electronica). Nexa Core NO
// implementa firma digital ni envio directo a SUNAT: Nubefact es quien
// firma y envia el XML/CDR bajo su propia homologacion como OSE. Aqui solo
// armamos el JSON que pide su API y guardamos lo que responde.
// Manual: https://goo.gl/WHMmSb

const TIPO_COMPROBANTE_NUBEFACT: Record<"factura" | "boleta", number> = {
  factura: 1,
  boleta: 2,
};

const SERIE_POR_TIPO: Record<"factura" | "boleta", string> = {
  factura: "F001",
  boleta: "B001",
};

export function serieParaTipo(tipo: ComprobanteTipo): string | null {
  if (tipo === "factura" || tipo === "boleta") return SERIE_POR_TIPO[tipo];
  return null;
}

function fechaNubefact(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${y}`;
}

interface EmitirParams {
  tipo: "factura" | "boleta";
  serie: string;
  numero: number;
  fechaEmision: string;
  clienteTipoDocumento: "RUC" | "DNI";
  clienteNumeroDocumento: string;
  clienteDenominacion: string;
  clienteDireccion: string;
  concepto: string;
  subtotal: number;
  igv: number;
  total: number;
  afectoIgv: boolean;
}

export interface NubefactResultado {
  ok: boolean;
  aceptado: boolean;
  mensaje: string;
  pdfUrl: string | null;
  xmlUrl: string | null;
  cdrUrl: string | null;
}

export async function emitirComprobante(params: EmitirParams): Promise<NubefactResultado> {
  const apiUrl = process.env.NUBEFACT_API_URL;
  const apiToken = process.env.NUBEFACT_API_TOKEN;
  if (!apiUrl || !apiToken) {
    return {
      ok: false,
      aceptado: false,
      mensaje: "NUBEFACT_API_URL / NUBEFACT_API_TOKEN no configurados.",
      pdfUrl: null,
      xmlUrl: null,
      cdrUrl: null,
    };
  }

  const item = {
    unidad_de_medida: "ZZ",
    codigo: "SERV001",
    descripcion: params.concepto || "Servicio de consultoría",
    cantidad: 1,
    valor_unitario: params.subtotal,
    precio_unitario: params.total,
    subtotal: params.subtotal,
    tipo_de_igv: params.afectoIgv ? 1 : 9,
    igv: params.igv,
    total: params.total,
    anticipo_regularizacion: false,
  };

  const body = {
    operacion: "generar_comprobante",
    tipo_de_comprobante: TIPO_COMPROBANTE_NUBEFACT[params.tipo],
    serie: params.serie,
    numero: params.numero,
    sunat_transaction: 1,
    fecha_de_emision: fechaNubefact(params.fechaEmision),
    moneda: 1,
    porcentaje_de_igv: 18.0,
    cliente_tipo_de_documento: params.clienteTipoDocumento === "RUC" ? "6" : "1",
    cliente_numero_de_documento: params.clienteNumeroDocumento,
    cliente_denominacion: params.clienteDenominacion,
    cliente_direccion: params.clienteDireccion || "-",
    total_gravada: params.afectoIgv ? params.subtotal : 0,
    total_inafecta: params.afectoIgv ? 0 : params.subtotal,
    total_igv: params.igv,
    total: params.total,
    enviar_automaticamente_a_la_sunat: true,
    enviar_automaticamente_al_cliente: false,
    formato_de_pdf: "A4",
    items: [item],
  };

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: apiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      ok: false,
      aceptado: false,
      mensaje: `No se pudo contactar a Nubefact: ${err instanceof Error ? err.message : String(err)}`,
      pdfUrl: null,
      xmlUrl: null,
      cdrUrl: null,
    };
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data) {
    return {
      ok: false,
      aceptado: false,
      mensaje: data?.errors ? String(data.errors) : `Nubefact respondió ${response.status}`,
      pdfUrl: null,
      xmlUrl: null,
      cdrUrl: null,
    };
  }

  return {
    ok: true,
    aceptado: Boolean(data.aceptada_por_sunat),
    mensaje: data.sunat_description || data.sunat_note || "Sin descripción de SUNAT.",
    pdfUrl: data.enlace_del_pdf ?? null,
    xmlUrl: data.enlace_del_xml ?? null,
    cdrUrl: data.enlace_del_cdr ?? null,
  };
}
