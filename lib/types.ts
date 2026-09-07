export type UserRole = "admin" | "qa" | "developer" | "backend" | "frontend";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export type TipoDocumento = "RUC" | "DNI";

export type ClienteEstado = "activo" | "piloto" | "pausado" | "cerrado";

export const CLIENTE_ESTADOS: ClienteEstado[] = ["activo", "piloto", "pausado", "cerrado"];

export const CLIENTE_ESTADO_LABELS: Record<ClienteEstado, string> = {
  activo: "Activo",
  piloto: "Piloto",
  pausado: "Pausado",
  cerrado: "Cerrado",
};

export interface Cliente {
  id: string;
  nombre: string;
  nombre_comercial: string | null;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  distrito: string | null;
  direccion: string | null;
  contacto_nombre: string | null;
  contacto_cargo: string | null;
  contacto_telefono: string | null;
  contacto_correo: string | null;
  estado: ClienteEstado;
  fecha_alta: string;
  notas: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ServicioTipo = "unico" | "recurrente";

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_referencial: number | null;
  tipo: ServicioTipo;
  created_at: string;
}

export type ComprobanteTipo = "factura" | "boleta" | "recibo_honorarios" | "sin_comprobante";

export const COMPROBANTE_TIPO_LABELS: Record<ComprobanteTipo, string> = {
  factura: "Factura",
  boleta: "Boleta",
  recibo_honorarios: "Recibo por honorarios",
  sin_comprobante: "Sin comprobante",
};

export type EstadoPago = "pendiente" | "cobrado" | "anulado";

export type MedioPago = "yape" | "plin" | "transferencia" | "efectivo" | "tarjeta";

export const MEDIO_PAGO_LABELS: Record<MedioPago, string> = {
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
};

// Display-only status: "vencido" is derived (pendiente + fecha_vencimiento
// pasada), never written to estado_pago directly.
export type EstadoComprobanteDisplay = EstadoPago | "vencido";

export interface Comprobante {
  id: string;
  cliente_id: string;
  servicio_id: string | null;
  concepto: string | null;
  tipo: ComprobanteTipo;
  serie_numero: string | null;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  subtotal: number;
  afecto_igv: boolean;
  igv: number;
  total: number;
  estado_pago: EstadoPago;
  medio_pago: MedioPago | null;
  fecha_cobro: string | null;
  url_adjunto: string | null;
  notas: string | null;
  nubefact_pdf_url: string | null;
  nubefact_xml_url: string | null;
  nubefact_cdr_url: string | null;
  nubefact_aceptado: boolean | null;
  nubefact_mensaje: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function estadoComprobanteDisplay(c: Pick<Comprobante, "estado_pago" | "fecha_vencimiento">): EstadoComprobanteDisplay {
  if (c.estado_pago === "pendiente" && c.fecha_vencimiento) {
    const hoy = new Date().toISOString().slice(0, 10);
    if (c.fecha_vencimiento < hoy) return "vencido";
  }
  return c.estado_pago;
}

export interface NotaCliente {
  id: string;
  cliente_id: string;
  fecha: string;
  nota: string;
  created_by: string | null;
  created_at: string;
}

export type GastoCategoria =
  | "infraestructura"
  | "software"
  | "marketing"
  | "legal_contable"
  | "equipos"
  | "otros";

export const GASTO_CATEGORIAS: GastoCategoria[] = [
  "infraestructura",
  "software",
  "marketing",
  "legal_contable",
  "equipos",
  "otros",
];

export const GASTO_CATEGORIA_LABELS: Record<GastoCategoria, string> = {
  infraestructura: "Infraestructura",
  software: "Software",
  marketing: "Marketing",
  legal_contable: "Legal y contable",
  equipos: "Equipos",
  otros: "Otros",
};

export type GastoFrecuencia = "unico" | "mensual" | "anual";

export const GASTO_FRECUENCIA_LABELS: Record<GastoFrecuencia, string> = {
  unico: "Único",
  mensual: "Mensual",
  anual: "Anual",
};

export interface Gasto {
  id: string;
  fecha: string;
  concepto: string;
  proveedor: string | null;
  categoria: GastoCategoria;
  frecuencia: GastoFrecuencia;
  monto: number;
  igv: number;
  credito_fiscal: boolean;
  anulado: boolean;
  medio_pago: MedioPago | null;
  url_adjunto: string | null;
  notas: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type RegimenRenta = "mype_tributario" | "general";

export const REGIMEN_RENTA_LABELS: Record<RegimenRenta, string> = {
  mype_tributario: "MYPE Tributario",
  general: "Régimen General",
};

export interface Configuracion {
  id: true;
  ruc: string;
  razon_social: string;
  regimen_renta: RegimenRenta;
  updated_at: string;
}
