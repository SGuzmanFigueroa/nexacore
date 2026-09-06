import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .eq("id", user.id)
    .single();

  return profile as Profile | null;
}

// Nexa Core is single-tenant admin-only: any signed-in user who isn't an
// admin (e.g. a bug-tracker/equipo-nexa QA account, since auth is shared)
// gets signed out instead of seeing a "not allowed" shell.
export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (profile.role !== "admin") {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?error=" + encodeURIComponent("Esta cuenta no tiene acceso a Nexa Core."));
  }

  return profile;
}
