"use client";

import { useOptimistic, useTransition } from "react";
import { setFollow } from "./actions";

/**
 * Flips instantly when tapped ("optimistic UI"), then saves in the
 * background. If saving fails, React puts it back the way it was.
 */
export function FollowButton({
  themeId,
  following,
  size = "small",
}: {
  themeId: number;
  following: boolean;
  size?: "small" | "large";
}) {
  const [optimistic, setOptimistic] = useOptimistic(following);
  const [pending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault(); // the button sits inside a link to the theme page
    startTransition(async () => {
      setOptimistic(!optimistic);
      await setFollow(themeId, !optimistic);
    });
  }

  const base =
    size === "large"
      ? "w-full rounded-xl px-4 py-3 text-lg font-bold"
      : "rounded-full px-3 py-1 text-sm font-bold";
  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-pressed={optimistic}
      className={`${base} ${optimistic ? "bg-navy text-white" : "bg-brick text-navy"}`}
    >
      {optimistic ? "✓ Following" : "+ Follow"}
    </button>
  );
}
