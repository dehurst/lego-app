"use client";

import Link from "next/link";
import { useActionState } from "react";
import { buttonPrimary, Card, inputClass } from "@/components/card";
import { PASSWORD_MIN, USERNAME_RULES } from "@/lib/username";
import { signUp } from "./actions";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, undefined);

  return (
    <Card title="Join Brick Drop">
      <form action={formAction} className="flex flex-col gap-3">
        <label className="text-sm text-zinc-600">
          Invite code
          <input
            name="invite"
            required
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="BRICK-XXXX-XXXX"
            className={inputClass}
          />
        </label>
        <label className="text-sm text-zinc-600">
          Pick a username
          <input
            name="username"
            required
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            pattern="[a-zA-Z0-9_]{3,20}"
            className={inputClass}
          />
          <span className="text-xs text-zinc-400">
            {USERNAME_RULES}. Don&apos;t use your real name.
          </span>
        </label>
        <label className="text-sm text-zinc-600">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={PASSWORD_MIN}
            autoComplete="new-password"
            className={inputClass}
          />
          <span className="text-xs text-zinc-400">At least {PASSWORD_MIN} characters.</span>
        </label>
        {state?.error && (
          <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700" role="alert">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending ? "Creating account…" : "Create account"}
        </button>
        <p className="text-center text-xs text-zinc-500">
          We only store your username, not your name or email.{" "}
          <Link href="/privacy" className="underline">
            What we store
          </Link>
        </p>
        <p className="text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-navy underline">
            Log in
          </Link>
        </p>
      </form>
    </Card>
  );
}
