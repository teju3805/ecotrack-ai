import "./globals.css";
import AppShell from "@/components/AppShell";
import { AppStateProvider } from "@/components/AppState";

export const metadata = {
  title: "EcoTrack AI — Environmental Policy Intelligence",
  description: "Compare versions of environmental guidance: change log, stakeholder impact and exact obligation wording.",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppStateProvider>
          <AppShell>{children}</AppShell>
        </AppStateProvider>
      </body>
    </html>
  );
}
