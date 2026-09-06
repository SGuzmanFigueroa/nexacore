-- Nada de borrado fisico tampoco para gastos: se marcan como anulado en
-- vez de eliminarse, igual que clientes (estado) y comprobantes (estado_pago).
alter table core_gastos add column anulado boolean not null default false;
