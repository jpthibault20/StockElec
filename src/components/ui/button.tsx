import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

const base =
  "inline-flex min-h-touch items-center justify-center gap-2 rounded-control px-4 font-semibold " +
  "transition-[transform,background-color,opacity] duration-150 active:scale-[0.97] " +
  "disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary-solid text-on-primary shadow-sm hover:brightness-110",
  secondary: "bg-accent text-on-accent shadow-sm hover:brightness-105",
  ghost: "text-fg hover:bg-surface-muted",
  danger: "border border-alert text-alert hover:bg-alert-soft",
};

const sizes: Record<Size, string> = {
  md: "text-base",
  lg: "min-h-14 px-5 text-lg",
};

type StyleProps = { variant?: Variant; size?: Size; icon?: ReactNode };

export function buttonClasses({ variant = "primary", size = "md" }: StyleProps = {}): string {
  return cn(base, variants[variant], sizes[size]);
}

export function Button({
  variant,
  size,
  icon,
  className,
  children,
  type = "button",
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return (
    <button type={type} className={cn(buttonClasses({ variant, size }), className)} {...props}>
      {icon}
      {children}
    </button>
  );
}

// Same look as Button, for navigation.
export function ButtonLink({
  variant,
  size,
  icon,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return (
    <Link className={cn(buttonClasses({ variant, size }), className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}

// Square icon-only button. `label` is required for screen readers.
// `tone`: "chrome" on the dark structural bars, "danger" for destructive
// actions, "primary" for a filled main action (e.g. +1).
export function IconButton({
  label,
  className,
  children,
  type = "button",
  tone = "default",
  active = false,
  round = false,
  ...props
}: ComponentProps<"button"> & {
  label: string;
  tone?: "default" | "chrome" | "danger" | "primary";
  active?: boolean;
  // Circle instead of rounded square.
  round?: boolean;
}) {
  const colors = {
    default: active ? "bg-accent-soft text-primary" : "text-fg hover:bg-surface-muted",
    chrome: active ? "bg-chrome-raised text-chrome-active" : "text-chrome-fg hover:bg-chrome-raised",
    danger: "text-alert hover:bg-alert-soft",
    primary: "bg-primary-solid text-on-primary shadow-sm hover:brightness-110",
  }[tone];
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-touch shrink-0 items-center justify-center",
        round ? "rounded-full" : "rounded-control",
        "transition-[transform,background-color] duration-150 active:scale-90",
        colors,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
