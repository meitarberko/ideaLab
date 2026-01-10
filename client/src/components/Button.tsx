import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    variant?: ButtonVariant;
  }
>;

export function Button({
  loading = false,
  variant = "primary",
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  const base = "btn";
  const variants: Record<ButtonVariant, string> = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    danger: "btn-danger"
  };

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={[base, variants[variant], className].filter(Boolean).join(" ")}
    >
      <span className="btn-inner">
        {loading ? <span className="btn-spinner" aria-hidden="true" /> : null}
        <span>{loading ? "Loading..." : children}</span>
      </span>
    </button>
  );
}
