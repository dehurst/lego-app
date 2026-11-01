export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-yellow-300 px-6 text-center">
      <div className="text-7xl" aria-hidden>
        🧱
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">
        Brick Drop
      </h1>
      <p className="max-w-sm text-lg text-zinc-800">
        New LEGO sets, straight to your phone.
      </p>
      <p className="rounded-full bg-zinc-900 px-4 py-1 text-sm font-medium text-yellow-300">
        Milestone 0: it&apos;s alive
      </p>
    </main>
  );
}
