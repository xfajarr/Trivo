import { useState } from "react";

interface AccessCodeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (code: string) => void;
}

const ACCESS_CODES = ["TRIVO2026", "ARC-BETA", "AGENT-01"];

export function AccessCodeDialog({ open, onClose, onSuccess }: AccessCodeDialogProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (ACCESS_CODES.includes(normalized)) {
      setError(false);
      onSuccess(normalized);
      onClose();
      setCode("");
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog Card */}
      <div className="relative z-10 w-full max-w-[420px] mx-4 rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="h-4 w-4">
            <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
          </svg>
        </button>

        <div className="flex flex-col space-y-1.5 text-center">
          <h2 className="font-display text-xl font-semibold leading-none tracking-tight">
            Access Code Required
          </h2>
          <p className="text-sm text-muted-foreground pt-2">
            Trivo is in early access. Enter your access code to continue to the app.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(false);
              }}
              placeholder="Enter access code"
              className="ticker w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 focus:border-neon/50 focus:ring-1 focus:ring-neon/30"
              autoFocus
            />
            {error && (
              <p className="ticker mt-2 text-xs text-loss">
                Invalid code. Try again.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!code.trim()}
            className="w-full rounded-lg bg-neon py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-neon/90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Enter App
          </button>
        </form>

        <p className="text-center text-[11px] text-muted-foreground pt-3">
          Don't have a code?{" "}
          <a
            href="https://x.com/trivoxyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neon/80 hover:text-neon underline underline-offset-2 transition-colors"
          >
            DM us on X
          </a>
        </p>
      </div>
    </div>
  );
}
