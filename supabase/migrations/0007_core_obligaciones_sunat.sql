-- Estado manual de las obligaciones mensuales SUNAT: Registros SIRE y
-- Formulario Virtual 621 (IGV-Renta), cada una con su propio ciclo de
-- estados. Nexa Core no presenta ni paga nada por si mismo -- esto solo
-- registra lo que el admin ya hizo directamente en SUNAT Operaciones en
-- Linea, para que el Panel deje de mostrar como pendiente algo que ya se
-- resolvio. Nunca se marca automaticamente por la sola existencia de un
-- movimiento.
create type core_obligacion_tipo as enum ('sire', 'fv621');
create type core_obligacion_estado as enum ('pendiente', 'presentado', 'declarado', 'pagado');

create table core_obligaciones_sunat (
  id uuid primary key default gen_random_uuid(),
  periodo text not null,
  tipo core_obligacion_tipo not null,
  estado core_obligacion_estado not null default 'pendiente',
  fecha_presentacion date,
  fecha_pago date,
  monto_igv numeric(12,2),
  monto_renta numeric(12,2),
  total_pagado numeric(12,2),
  numero_orden text,
  observaciones text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint core_obligaciones_sunat_estado_tipo_check check (
    (tipo = 'sire' and estado in ('pendiente', 'presentado')) or
    (tipo = 'fv621' and estado in ('pendiente', 'declarado', 'pagado'))
  )
);
create unique index core_obligaciones_sunat_periodo_tipo_key on core_obligaciones_sunat(periodo, tipo);
create trigger set_updated_at before update on core_obligaciones_sunat
  for each row execute function set_updated_at();

alter table core_obligaciones_sunat enable row level security;
create policy "admin_all" on core_obligaciones_sunat for all using (is_admin()) with check (is_admin());

-- El recordatorio por correo (netlify/functions/recordatorio-sunat.mts)
-- ahora distingue SIRE de FV621 -- antes solo avisaba de "SUNAT" en
-- general con una sola fecha. Las filas existentes eran todas del
-- Formulario 621, que es el unico que se avisaba hasta ahora.
alter table core_recordatorios_sunat_enviados add column tipo core_obligacion_tipo not null default 'fv621';
alter table core_recordatorios_sunat_enviados drop constraint core_recordatorios_sunat_enviados_pkey;
alter table core_recordatorios_sunat_enviados add primary key (periodo, tipo, dias_antes);
alter table core_recordatorios_sunat_enviados alter column tipo drop default;
