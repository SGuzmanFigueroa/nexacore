"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  icon,
  badge,
  badgeAlert,
  onNavigate,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  badgeAlert?: boolean;
  onNavigate?: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-[11px] rounded-[9px] px-3 py-2.5 text-[13.5px] transition-colors ${
        isActive
          ? "bg-nexa-navy-active font-semibold text-white"
          : "font-medium text-nexa-sidebar-text hover:bg-white/5 hover:text-white"
      }`}
    >
      <span
        className={isActive ? "text-nexa-sky" : "text-nexa-sidebar-icon"}
        style={{ display: "flex" }}
      >
        {icon}
      </span>
      <span>{children}</span>
      {badge !== undefined && (
        <span
          className={`num ml-auto text-[10.5px] font-bold ${
            badgeAlert
              ? "rounded-full bg-nexa-badge px-[7px] py-[2px] text-nexa-navy"
              : "text-nexa-sidebar-text-muted"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
