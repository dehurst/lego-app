import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="text-6xl" aria-hidden>
        🔍
      </div>
      <h1 className="text-2xl font-extrabold text-brick">Page not found</h1>
      <p className="max-w-sm text-zinc-300">
        That page doesn&apos;t exist. Maybe it was a brick that got vacuumed up.
      </p>
      <Link href="/" className="rounded-xl bg-brick px-6 py-3 text-lg font-bold text-navy">
        Go home
      </Link>
    </main>
  );
}
