-- IGV discriminado y derecho a credito fiscal en los gastos, para poder
-- estimar el IGV a pagar (IGV de ventas - IGV de compras con credito fiscal).
alter table core_gastos
  add column igv numeric(12,2) not null default 0,
  add column credito_fiscal boolean not null default false,
  add constraint core_gastos_igv_check check (igv >= 0 and igv <= monto);

-- Configuracion tributaria de Nexa Consulting TI (fila unica). El regimen
-- es lo unico realmente variable; RUC y razon social casi nunca cambian
-- pero se guardan aqui para no hardcodearlos en el codigo.
create type core_regimen_renta as enum ('mype_tributario', 'general');

create table core_configuracion (
  id boolean primary key default true,
  ruc text not null,
  razon_social text not null,
  regimen_renta core_regimen_renta not null default 'mype_tributario',
  updated_at timestamptz not null default now(),
  constraint core_configuracion_singleton check (id)
);

create trigger set_updated_at before update on core_configuracion
  for each row execute function set_updated_at();

alter table core_configuracion enable row level security;
create policy "admin_all" on core_configuracion for all using (is_admin()) with check (is_admin());

insert into core_configuracion (id, ruc, razon_social, regimen_renta)
values (true, '20616354664', 'NEXA CONSULTING TI S.A.C.', 'mype_tributario');
