"use client";

import { useActionState, useState } from "react";
import { fetchBricksetNow, resetPassword, runCheckNow, simulateNewSet } from "./actions";

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

function CheckResult({ state }: { state: Awaited<ReturnType<typeof runCheckNow>> }) {
  if (!state) return null;
  return state.ok ? (
    <p className="text-sm text-green-700">✓ {state.summary}</p>
  ) : (
    <p className="text-sm text-red-700">Failed: {state.error}</p>
  );
}

export function RunCheckButton() {
  const [state, formAction, pending] = useActionState(runCheckNow, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-navy px-4 py-3 font-bold text-white disabled:opacity-40"
      >
        {pending ? "Checking… (about 10 seconds)" : "Run hourly check now"}
      </button>
      <CheckResult state={state} />
    </form>
  );
}

export function FetchBricksetButton() {
  const [state, formAction, pending] = useActionState(fetchBricksetNow, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-navy px-4 py-3 font-bold text-white disabled:opacity-40"
      >
        {pending ? "Fetching… (up to 30 seconds)" : "Fetch from Brickset now"}
      </button>
      <CheckResult state={state} />
    </form>
  );
}

export function SimulateNewSetForm({ themes }: { themes: { id: number; name: string }[] }) {
  const [state, formAction, pending] = useActionState(simulateNewSet, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <select
        name="themeId"
        required
        defaultValue=""
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base text-zinc-900"
      >
        <option value="" disabled>
          Pick a theme someone follows…
        </option>
        {themes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brick px-4 py-3 font-bold text-navy disabled:opacity-40"
      >
        {pending ? "Simulating…" : "Simulate a new set"}
      </button>
      <CheckResult state={state} />
    </form>
  );
}
