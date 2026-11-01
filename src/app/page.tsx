import { DeviceStatus } from "@/components/device-status";
import { InstallGuide } from "@/components/install-guide";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icon-192.png"
        alt=""
        width={96}
        height={96}
        className="rounded-3xl shadow-lg shadow-black/40"
      />
      <h1 className="text-4xl font-extrabold tracking-tight text-brick">
        Brick Drop
      </h1>
      <p className="max-w-sm text-lg text-zinc-300">
        New LEGO sets, straight to your phone.
      </p>
      <InstallGuide />
      <DeviceStatus />
    </main>
  );
}
