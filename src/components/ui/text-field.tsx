import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type TextFieldProps = ComponentProps<"input"> & {
  label: string;
  hint?: string;
  error?: string | null;
};

// Labelled text input with optional hint and error message.
export function TextField({ label, hint, error, className, id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "min-h-touch rounded-control border bg-surface px-3 text-base text-fg",
          "placeholder:text-muted transition-colors duration-150",
          error ? "border-alert" : "border-border-strong focus:border-primary",
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-sm font-medium text-alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextAreaFieldProps = ComponentProps<"textarea"> & { label: string; hint?: string };

// Labelled multi-line text input.
export function TextAreaField({ label, hint, className, id, ...props }: TextAreaFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={inputId}
        aria-describedby={hint ? `${inputId}-hint` : undefined}
        className="min-h-24 rounded-control border border-border-strong bg-surface px-3 py-2 text-base text-fg placeholder:text-muted focus:border-primary"
        {...props}
      />
      {hint && (
        <p id={`${inputId}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
