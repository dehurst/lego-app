import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";

// The "Data Access Layer": the ONE place that decides who is logged in.
// Every page, API route and server action asks here; none of them trust
// anything the browser says about who someone is.

export type CurrentUser = {
  id: string;
  username: string;
  role: "member" | "admin";
  status: "pending" | "approved";
};

/** The logged-in person, or null. Cached for the rest of this request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSessionClient();
  // getClaims() cryptographically verifies the login token. (Never trust a
  // cookie's contents without verifying it.)
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("id, username, role, status")
    .eq("id", userId)
    .maybeSingle<CurrentUser>();
  return profile ?? null;
});

/** Logged in AND approved by an admin, or null. */
export async function getApprovedUser(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user?.status === "approved" ? user : null;
}

/** An approved admin, or null. */
export async function getAdminUser(): Promise<CurrentUser | null> {
  const user = await getApprovedUser();
  return user?.role === "admin" ? user : null;
}
