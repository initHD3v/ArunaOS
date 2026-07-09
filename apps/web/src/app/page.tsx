import { DesktopShell } from "@/layouts/desktop-shell";

export default function Home() {
  return (
    <DesktopShell>
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground/20">
            ArunaOS
          </h1>
        </div>
      </div>
    </DesktopShell>
  );
}