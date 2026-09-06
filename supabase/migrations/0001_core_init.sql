-- Nexa Core schema: clientes, servicios, comprobantes (ingresos), gastos,
-- notas de seguimiento por cliente.
--
-- Reusa profiles / is_admin() / set_updated_at() del esquema de bug-tracker
-- (mismo proyecto Supabase, misma cuenta admin). Todas las tablas nuevas
-- llevan el prefijo core_ para no chocar con las de bug-tracker
-- (tickets, projects) ni las de equipo-nexa (team_members).
--
-- "vencido" NO se almacena: se deriva en cada consulta a partir de
-- estado_pago = 'pendiente' + fecha_vencimiento pasada.

create type core_tipo_documento as enum ('RUC','DNI');
create type core_cliente_estado as enum ('activo','piloto','pausado','cerrado');
create type core_servicio_tipo as enum ('unico','recurrente');
create type core_comprobante_tipo as enum ('factura','boleta','recibo_honorarios','sin_comprobante');
create type core_estado_pago as enum ('pendiente','cobrado','anulado');
create type core_medio_pago as enum ('yape','plin','transferencia','efectivo','tarjeta');
create type core_gasto_categoria as enum ('infraestructura','software','marketing','legal_contable','equipos','otros');
create type core_gasto_frecuencia as enum ('unico','mensual','anual');

-- ---------------------------------------------------------------------------
-- core_clientes
-- ---------------------------------------------------------------------------
create table core_clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nombre_comercial text,
  tipo_documento core_tipo_documento not null,
  numero_documento text not null,
  distrito text,
  direccion text,
  contacto_nombre text,
  contacto_cargo text,
  contacto_telefono text,
  contacto_correo text,
  estado core_cliente_estado not null default 'piloto',
  fecha_alta date not null default current_date,
  notas text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index core_clientes_documento_key on core_clientes(tipo_documento, numero_documento);
create trigger set_updated_at before update on core_clientes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- core_servicios: catálogo de lo que vende Nexa
-- ---------------------------------------------------------------------------
create table core_servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio_referencial numeric(12,2),
  tipo core_servicio_tipo not null default 'unico',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- core_comprobantes: ingresos. Solo registra/concilia lo ya emitido en el
-- SEE de SUNAT o un facturador/OSE — no genera ni firma comprobantes.
-- ---------------------------------------------------------------------------
create table core_comprobantes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references core_clientes(id),
  servicio_id uuid references core_servicios(id),
  concepto text,
  tipo core_comprobante_tipo not null,
  serie_numero text,
  fecha_emision date not null default current_date,
  fecha_vencimiento date,
  subtotal numeric(12,2) not null,
  afecto_igv boolean not null default true,
  igv numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  estado_pago core_estado_pago not null default 'pendiente',
  medio_pago core_medio_pago,
  fecha_cobro date,
  url_adjunto text,
  notas text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (round(total,2) = round(subtotal + igv, 2))
);
create index core_comprobantes_cliente_idx on core_comprobantes(cliente_id);
create index core_comprobantes_estado_idx on core_comprobantes(estado_pago);
create index core_comprobantes_fecha_venc_idx on core_comprobantes(fecha_vencimiento);
create trigger set_updated_at before update on core_comprobantes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- core_gastos
-- ---------------------------------------------------------------------------
create table core_gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  concepto text not null,
  proveedor text,
  categoria core_gasto_categoria not null,
  frecuencia core_gasto_frecuencia not null default 'unico',
  monto numeric(12,2) not null,
  medio_pago core_medio_pago,
  url_adjunto text,
  notas text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index core_gastos_categoria_idx on core_gastos(categoria);
create index core_gastos_fecha_idx on core_gastos(fecha);
create trigger set_updated_at before update on core_gastos
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- core_notas_cliente: seguimiento fechado por cliente (mismo patrón que
-- team_member_tracking en equipo-nexa)
-- ---------------------------------------------------------------------------
create table core_notas_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references core_clientes(id) on delete cascade,
  fecha date not null default current_date,
  nota text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index core_notas_cliente_cliente_idx on core_notas_cliente(cliente_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: solo profiles.role = 'admin' lee/escribe
-- ---------------------------------------------------------------------------
alter table core_clientes enable row level security;
alter table core_servicios enable row level security;
alter table core_comprobantes enable row level security;
alter table core_gastos enable row level security;
alter table core_notas_cliente enable row level security;

create policy "admin_all" on core_clientes for all using (is_admin()) with check (is_admin());
create policy "admin_all" on core_servicios for all using (is_admin()) with check (is_admin());
create policy "admin_all" on core_comprobantes for all using (is_admin()) with check (is_admin());
create policy "admin_all" on core_gastos for all using (is_admin()) with check (is_admin());
create policy "admin_all" on core_notas_cliente for all using (is_admin()) with check (is_admin());
