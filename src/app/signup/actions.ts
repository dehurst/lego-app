"use server";

import { redirect } from "next/navigation";
import { optionalEnv } from "@/lib/env";
import { safeEqual } from "@/lib/secrets";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";
import {
  PASSWORD_MIN,
  USERNAME_RULES,
  isValidUsername,
  normalizeUsername,
  usernameToLoginEmail,
} from "@/lib/username";

export type SignupState = { error: string } | undefined;

// Server Actions run on the server, even though the form calls them like a
// normal function. Everything here is checked again: never trust the browser.
export async function signUp(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const rawInvite = String(formData.get("invite") ?? "").trim();
  const code = rawInvite.toUpperCase();

  if (!isValidUsername(username)) return { error: `Username must be ${USERNAME_RULES}.` };
  if (password.length < PASSWORD_MIN || password.length > 72) {
    return { error: `Password must be at least ${PASSWORD_MIN} characters.` };
  }
  if (!rawInvite) return { error: "You need an invite code." };

  const db = createAdminClient();
  const now = new Date().toISOString();

  // One-time setup: the very first admin signs up with ADMIN_SECRET as the
  // invite code. Once an admin exists, this path is closed for good.
  let isFirstAdmin = false;
  const adminSecret = optionalEnv("ADMIN_SECRET");
  if (adminSecret && safeEqual(rawInvite, adminSecret)) {
    const { count } = await db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) return { error: "That invite code isn't valid." };
    isFirstAdmin = true;
  } else {
    const { data: invite } = await db
      .from("invite_codes")
      .select("id")
      .eq("code", code)
      .is("used_at", null)
      .gt("expires_at", now)
      .maybeSingle();
    if (!invite) return { error: "That invite code isn't valid, has expired, or was already used." };
  }

  // 1) Create the login. email_confirm: true because there's no real email.
  const email = usernameToLoginEmail(username);
  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    if (createError?.code === "email_exists" || /already/i.test(createError?.message ?? "")) {
      return { error: "That username is taken. Try another." };
    }
    console.error("createUser failed", createError);
    return { error: "Couldn't create the account. Please try again." };
  }
  const userId = created.user.id;

  // If a later step fails, delete the login so nothing is left half-made.
  const undo = async (error: string): Promise<SignupState> => {
    await db.auth.admin.deleteUser(userId);
    return { error };
  };

  // 2) Create the profile.
  const { error: profileError } = await db.from("profiles").insert({
    id: userId,
    username,
    role: isFirstAdmin ? "admin" : "member",
    status: isFirstAdmin ? "approved" : "pending",
    approved_at: isFirstAdmin ? now : null,
  });
  if (profileError) {
    return undo(
      profileError.code === "23505"
        ? "That username is taken. Try another."
        : "Couldn't create the account. Please try again.",
    );
  }

  // 3) Use up the invite code. The `used_at is null` condition makes this
  //    atomic: if two people race with the same code, only one update wins.
  if (!isFirstAdmin) {
    const { data: claimed } = await db
      .from("invite_codes")
      .update({ used_at: now, used_by: userId })
      .eq("code", code)
      .is("used_at", null)
      .gt("expires_at", now)
      .select("id");
    if (!claimed?.length) return undo("That invite code was just used by someone else.");
  }

  // 4) Log them in (this sets the session cookie on this device).
  const supabase = await createSessionClient();
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  redirect(loginError ? "/login" : "/");
}
