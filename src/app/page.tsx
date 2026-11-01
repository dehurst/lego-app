import Image from "next/image";
import { DeviceStatus } from "@/components/device-status";
import { InstallGuide } from "@/components/install-guide";
// Importing the image (instead of linking to /public) gives it a unique,
// content-based URL, so phones always show the latest version.
import logo from "@/assets/logo-wordmark.png";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <h1>
        <Image src={logo} alt="Brick Drop" priority className="h-auto w-64" />
      </h1>
      <p className="max-w-sm text-lg text-zinc-300">
        New LEGO sets, straight to your phone.
      </p>
      <InstallGuide />
      <DeviceStatus />
    </main>
  );
}
