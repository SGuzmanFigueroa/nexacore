-- Bucket privado de Storage para adjuntos de comprobantes y gastos (Fase 4).
-- No es público: solo se accede vía URL firmada de corta duración, generada
-- en /api/adjuntos/[...path] tras validar que el usuario es admin.

insert into storage.buckets (id, name, public)
values ('core-adjuntos', 'core-adjuntos', false)
on conflict (id) do nothing;

create policy "core_adjuntos_admin_all"
on storage.objects for all
using (bucket_id = 'core-adjuntos' and is_admin())
with check (bucket_id = 'core-adjuntos' and is_admin());
