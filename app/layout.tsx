import type { Metadata } from "next";
import type { ReactNode } from "react";

import { BrowserCleanup } from "@/components/browser-cleanup";

import "./globals.css";

export const metadata: Metadata = {
  title: "Schellerhart Kroegentocht | 10 jaar samen op stap",
  description: "Realtime mobiele webapp voor de feesteditie van de Schellerhart Kroegentocht, met Nel Bannink centraal en 10 jaar samen op stap."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <BrowserCleanup />
        {children}
      </body>
    </html>
  );
}
