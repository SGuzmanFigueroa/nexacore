import LoginBrandPanel from "@/components/login/LoginBrandPanel";
import LoginForm from "@/components/login/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-nexa-app-bg md:flex-row">
      <LoginBrandPanel />
      <LoginForm error={error} />
    </div>
  );
}
