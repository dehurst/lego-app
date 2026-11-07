import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { InstallGuide } from "@/components/install-guide";
import { InstalledOnly } from "@/components/installed-only";
// Importing the image (instead of linking to /public) gives it a unique,
// content-based URL, so phones always show the latest version.
import logo from "@/assets/logo-wordmark.png";
import { Account } from "./account";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      {/* Everything above the Suspense boundary is the same for everyone,
          so it loads instantly. */}
      <h1>
        <Image src={logo} alt="Brick Drop" priority className="h-auto w-64" />
      </h1>
      <p className="max-w-sm text-lg text-zinc-300">
        New LEGO sets, straight to your phone.
      </p>
      <InstallGuide />
      <InstalledOnly>
        <Suspense fallback={<p className="text-zinc-400">Loading…</p>}>
          <Account />
        </Suspense>
      </InstalledOnly>
      <Link href="/privacy" className="text-xs text-zinc-500 underline">
        Privacy: what we store
      </Link>
    </main>
  );
}
