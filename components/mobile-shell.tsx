import Image from "next/image";
import type { ReactNode } from "react";

import type { Phase } from "@/lib/types";

type MobileShellProps = {
  title: string;
  subtitle: string;
  phase?: Phase;
  actions?: ReactNode;
  children: ReactNode;
};

const phaseArtwork: Record<
  Phase,
  { src: string; alt: string; label: string }
> = {
  waiting: {
    src: "/nel/nel-2.png",
    alt: "Nel Bannink kijkt vrolijk de kroeg in",
    label: "Wacht op de start"
  },
  upload: {
    src: "/nel/nel-3.png",
    alt: "Nel Bannink lacht tussen de mensen in de kroeg",
    label: "Uploadfase"
  },
  voting: {
    src: "/nel/nel-1.png",
    alt: "Nel Bannink proost met een telefoon in beeld",
    label: "Stemfase"
  },
  results: {
    src: "/nel/nel-4.png",
    alt: "Nel Bannink heft een glas bier",
    label: "Resultaten"
  }
};

export function MobileShell({
  title,
  subtitle,
  phase = "waiting",
  actions,
  children
}: MobileShellProps) {
  const artwork = phaseArtwork[phase];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.2),_transparent_35%),linear-gradient(180deg,_#fff7ed_0%,_#f8fafc_42%,_#e2e8f0_100%)] px-4 py-6 text-ink">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col gap-4">
        <header className="rounded-4xl border border-white/70 bg-white/90 p-5 shadow-card backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-dark">
                Schellerhart kroegentocht
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
          <div className="mt-4 overflow-hidden rounded-3xl border border-white/70 bg-slate-950">
            <div className="relative h-56 w-full">
              <Image
                fill
                priority
                alt={artwork.alt}
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 420px"
                src={artwork.src}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 px-4 py-3 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
                  {artwork.label}
                </p>
              </div>
            </div>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
