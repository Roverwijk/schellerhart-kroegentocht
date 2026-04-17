import Image from "next/image";
import type { ReactNode } from "react";

import type { Phase } from "@/lib/types";

type MobileShellProps = {
  title: string;
  subtitle: string;
  phase?: Phase;
  roundNumber?: number | null;
  actions?: ReactNode;
  children: ReactNode;
};

const phaseArtwork: Record<Phase, { src: string; alt: string; label: string }> = {
  waiting: {
    src: "/nel/nel-a.png",
    alt: "Nel Bannink proost met een regenboogbril",
    label: "Wacht op de start"
  },
  upload: {
    src: "/nel/nel-b.png",
    alt: "Nel Bannink zingt feestelijk met een microfoon",
    label: "Uploadfase"
  },
  voting: {
    src: "/nel/nel-e.png",
    alt: "Nel Bannink houdt een biertje omhoog",
    label: "Stemfase"
  },
  results: {
    src: "/nel/nel-f.png",
    alt: "Nel Bannink trekt een gek gezicht",
    label: "Resultaten"
  }
};

const roundUploadArtwork: Record<number, { src: string; alt: string; label: string }> = {
  1: {
    src: "/nel/nel-b.png",
    alt: "Nel Bannink zingt feestelijk met een microfoon",
    label: "Ronde 1"
  },
  2: {
    src: "/nel/nel-c.png",
    alt: "Nel Bannink houdt een telefoon met proost in beeld",
    label: "Ronde 2"
  },
  3: {
    src: "/nel/nel-d.png",
    alt: "Nel Bannink houdt een shoarma omhoog",
    label: "Ronde 3"
  }
};

export function MobileShell({
  title,
  subtitle,
  phase = "waiting",
  roundNumber = null,
  actions,
  children
}: MobileShellProps) {
  const artwork =
    phase === "upload" && roundNumber ? roundUploadArtwork[roundNumber] ?? phaseArtwork.upload : phaseArtwork[phase];

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
