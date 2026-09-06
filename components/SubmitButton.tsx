"use client";

import { useFormStatus } from "react-dom";

const VARIANT_STYLES = {
  primary: "bg-nexa-blue text-white shadow-sm shadow-nexa-blue/30 hover:bg-nexa-navy",
  dark: "bg-nexa-navy text-white hover:bg-nexa-navy-active",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-slate-500 hover:bg-slate-100",
  "danger-ghost": "text-red-500 hover:underline",
} as const;

export default function SubmitButton({
  variant = "primary",
  pendingLabel = "Guardando...",
  className = "",
  children,
}: {
  variant?: keyof typeof VARIANT_STYLES;
  pendingLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 ${VARIANT_STYLES[variant]} ${className}`}
    >
      {pending && (
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}
