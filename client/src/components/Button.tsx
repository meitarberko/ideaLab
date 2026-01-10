import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

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
  ...rest
}: ButtonProps) {
  const base =
    "px-4 py-2 rounded-lg border transition disabled:opacity-60 disabled:cursor-not-allowed";
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-black text-white border-black",
    secondary: "bg-white text-black border-gray-300",
    ghost: "bg-transparent text-black border-transparent",
  };

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={[base, variants[variant], rest.className].filter(Boolean).join(" ")}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}
