"use client";

import { useActionState, useState } from "react";
import { resetPassword } from "./actions";

/** A submit button that asks "are you sure?" first. */
export function ConfirmButton({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export function ResetPasswordButton({ id, username }: { id: string; username: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, undefined);
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="id" value={id} />
      {state && "password" in state ? (
        <span className="block rounded-lg bg-green-50 p-2 text-sm text-green-800">
          New password for <b>{username}</b>:{" "}
          <code className="font-mono font-bold select-all">{state.password}</code>
          <br />
          Shown only once. Tell them now.
        </span>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="text-sm text-navy underline"
          onClick={(e) => {
            if (!window.confirm(`Reset ${username}'s password?`)) e.preventDefault();
          }}
        >
          {pending ? "Resetting…" : "Reset password"}
        </button>
      )}
      {state && "error" in state && <span className="text-sm text-red-700"> {state.error}</span>}
    </form>
  );
}

/** Opens the iPhone share sheet (Messages etc.) with ready-to-send instructions. */
export function ShareInviteButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    // Built on tap (not during render): `window` doesn't exist on the server.
    const text =
      `You're invited to Brick Drop! 🧱\n\n` +
      `1. Open ${window.location.origin} in Safari\n` +
      `2. Tap Share → Add to Home Screen\n` +
      `3. Open Brick Drop from your Home Screen and sign up with this code:\n\n${code}`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* cancelled — fall through to copy */
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <button type="button" onClick={share} className="text-sm font-semibold text-navy underline">
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
