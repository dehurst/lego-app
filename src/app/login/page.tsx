import { InstallGuide } from "@/components/install-guide";
import { InstalledOnly } from "@/components/installed-only";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
      <InstallGuide />
      <InstalledOnly>
        <LoginForm />
      </InstalledOnly>
    </main>
  );
}
