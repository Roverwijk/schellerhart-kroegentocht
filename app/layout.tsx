import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Schellerhart kroegentocht",
  description: "Realtime mobiele webapp voor de Schellerhart kroegentocht met Nel Bannink centraal."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
