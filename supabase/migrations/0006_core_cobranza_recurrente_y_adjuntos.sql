-- Cobranza recurrente por cliente: dia del mes en que corresponde cobrar.
-- NULL = no aplica (cliente sin cobro periodico fijo, ej. proyectos unicos).
alter table core_clientes add column dia_cobro smallint check (dia_cobro between 1 and 31);

-- Adjuntos adicionales de un comprobante (ademas del adjunto principal en
-- core_comprobantes.url_adjunto): comprobante de pago, contrato, etc.
create table core_comprobante_adjuntos (
  id uuid primary key default gen_random_uuid(),
  comprobante_id uuid not null references core_comprobantes(id) on delete cascade,
  storage_path text not null,
  nombre text,
  created_at timestamptz not null default now()
);
alter table core_comprobante_adjuntos enable row level security;
create policy "admin_all" on core_comprobante_adjuntos for all using (is_admin()) with check (is_admin());

-- Evita reenviar el mismo recordatorio de cobranza recurrente en el mismo periodo.
create table core_recordatorios_cobranza_enviados (
  cliente_id uuid not null references core_clientes(id) on delete cascade,
  periodo text not null,
  enviado_at timestamptz not null default now(),
  primary key (cliente_id, periodo)
);
alter table core_recordatorios_cobranza_enviados enable row level security;
create policy "admin_all" on core_recordatorios_cobranza_enviados for all using (is_admin()) with check (is_admin());
