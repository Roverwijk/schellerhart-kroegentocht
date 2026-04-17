import Link from "next/link";

import { MobileShell } from "@/components/mobile-shell";

const links = [
  {
    href: "/upload",
    title: "Upload",
    body: "Foto maken en spreekwoord insturen."
  },
  {
    href: "/vote",
    title: "Stem",
    body: "Raad de foto's van andere teams."
  },
  {
    href: "/admin",
    title: "Admin",
    body: "Fases, timer, scores en correcties."
  }
];

export default function HomePage() {
  return (
    <MobileShell
      title="Start"
      phase="waiting"
      subtitle="Schellerhart kroegentocht met Nel Bannink in de hoofdrol. Snel, mobiel en klaar voor de kroeg."
    >
      <section className="grid gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            className="rounded-4xl border border-white/70 bg-white/90 p-5 shadow-card transition hover:-translate-y-0.5"
            href={link.href}
          >
            <p className="text-lg font-black text-ink">{link.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{link.body}</p>
          </Link>
        ))}
      </section>
    </MobileShell>
  );
}
