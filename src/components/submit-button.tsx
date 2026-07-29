"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel,
  className = "btn-primary",
  ...rest
}: React.ComponentProps<"button"> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <button {...rest} type="submit" disabled={pending} className={className}>
      {pending && (
        <span
          aria-hidden
          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {pending ? (pendingLabel ?? "En cours…") : children}
    </button>
  );
}
