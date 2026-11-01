"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonPrimary, Card, inputClass } from "@/components/card";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { normalizeUsername, usernameToLoginEmail } from "@/lib/username";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const username = normalizeUsername(String(form.get("username") ?? ""));
    const password = String(form.get("password") ?? "");

    // Logging in from the browser (not our server) means Supabase's
    // too-many-attempts protection counts per device, not for everyone at once.
    const { error } = await createBrowserSupabase().auth.signInWithPassword({
      email: usernameToLoginEmail(username),
      password,
    });
    if (error) {
      setPending(false);
      setError(
        error.code === "invalid_credentials"
          ? "Wrong username or password."
          : `Couldn't log in: ${error.message}`,
      );
      return;
    }
    // Full page load so the server sees the new session cookie.
    window.location.replace("/");
  }

  return (
    <Card title="Log in">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="text-sm text-zinc-600">
          Username
          <input
            name="username"
            required
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            className={inputClass}
          />
        </label>
        <label className="text-sm text-zinc-600">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </label>
        {error && (
          <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending ? "Logging in…" : "Log in"}
        </button>
        <p className="text-center text-sm text-zinc-500">
          Forgot your password? Ask the admin to reset it.
          <br />
          New here?{" "}
          <Link href="/signup" className="font-semibold text-navy underline">
            Sign up with an invite code
          </Link>
        </p>
      </form>
    </Card>
  );
}
