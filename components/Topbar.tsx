export default function Topbar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex h-[68px] shrink-0 items-center gap-4 border-b border-nexa-border-topbar bg-white px-7">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1 className="truncate text-[17px] font-bold tracking-tight text-nexa-navy">{title}</h1>
        {subtitle && (
          <p className="truncate text-[11.5px] font-medium text-nexa-topbar-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="ml-auto flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}
