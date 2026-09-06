import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const [{ count: clientesCount }, { count: cobranzasPendientes }] = await Promise.all([
    supabase.from("core_clientes").select("*", { count: "exact", head: true }),
    supabase
      .from("core_comprobantes")
      .select("*", { count: "exact", head: true })
      .eq("estado_pago", "pendiente")
      .lt("fecha_vencimiento", new Date().toISOString().slice(0, 10)),
  ]);

  return (
    <div className="flex min-h-screen flex-col md:h-screen md:flex-row md:overflow-hidden">
      <Sidebar
        profile={profile}
        clientesCount={clientesCount ?? 0}
        cobranzasPendientes={cobranzasPendientes ?? 0}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-nexa-app-bg md:overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
