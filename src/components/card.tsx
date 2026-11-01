import type { ReactNode } from "react";

/** The white rounded panel used throughout the app. */
export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="w-full max-w-sm rounded-2xl bg-white p-5 text-left text-zinc-800 shadow-lg">
      {title && <h2 className="mb-2 text-lg font-bold text-zinc-900">{title}</h2>}
      <div className="text-base leading-relaxed">{children}</div>
    </section>
  );
}

export const buttonPrimary =
  "w-full rounded-xl bg-brick px-4 py-3 text-lg font-bold text-navy disabled:opacity-40";
export const buttonSecondary =
  "w-full rounded-xl bg-navy px-4 py-3 font-bold text-white disabled:opacity-40";
export const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-base text-zinc-900";
