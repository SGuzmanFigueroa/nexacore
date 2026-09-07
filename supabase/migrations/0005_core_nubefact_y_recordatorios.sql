-- Correlativo de series para una futura emision electronica real (Nubefact
-- u otro OSE). Queda listo pero desconectado del flujo mientras el token
-- sea de pruebas — ver lib/nubefact.ts.
create table core_series_comprobante (
  tipo core_comprobante_tipo not null,
  serie text not null,
  ultimo_numero integer not null default 0,
  primary key (tipo, serie)
);
alter table core_series_comprobante enable row level security;
create policy "admin_all" on core_series_comprobante for all using (is_admin()) with check (is_admin());

insert into core_series_comprobante (tipo, serie, ultimo_numero) values
  ('factura', 'F001', 0),
  ('boleta', 'B001', 0);

create or replace function core_siguiente_numero_comprobante(p_tipo core_comprobante_tipo, p_serie text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero integer;
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;

  update core_series_comprobante
  set ultimo_numero = ultimo_numero + 1
  where tipo = p_tipo and serie = p_serie
  returning ultimo_numero into v_numero;

  if v_numero is null then
    raise exception 'Serie % de tipo % no configurada', p_serie, p_tipo;
  end if;

  return v_numero;
end;
$$;

alter table core_comprobantes
  add column nubefact_pdf_url text,
  add column nubefact_xml_url text,
  add column nubefact_cdr_url text,
  add column nubefact_aceptado boolean,
  add column nubefact_mensaje text;

-- Evita reenviar el mismo recordatorio de vencimiento SUNAT mas de una vez
-- (por periodo + cuantos dias antes se avisa). Usado por la funcion
-- programada de Netlify netlify/functions/recordatorio-sunat.mts.
create table core_recordatorios_sunat_enviados (
  periodo text not null,
  dias_antes integer not null,
  enviado_at timestamptz not null default now(),
  primary key (periodo, dias_antes)
);
alter table core_recordatorios_sunat_enviados enable row level security;
create policy "admin_all" on core_recordatorios_sunat_enviados for all using (is_admin()) with check (is_admin());
