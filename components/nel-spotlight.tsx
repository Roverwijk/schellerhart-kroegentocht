"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
  {
    src: "/nel/nel-2.png",
    alt: "Nel Bannink trekt een gekke bek in de kroeg",
    eyebrow: "Schellerhart kroegentocht",
    title: "Nel Bannink trapt af",
    body: "Welkom in het spel. Nel 2 staat meteen vooraan en zet de toon voor de avond."
  },
  {
    src: "/nel/nel-3.png",
    alt: "Nel Bannink lacht tussen een groep feestvierders",
    eyebrow: "Samen in de kroeg",
    title: "Nel brengt leven in de brouwerij",
    body: "Daarna volgt Nel 3, midden in de gezelligheid van de tocht."
  },
  {
    src: "/nel/nel-1.png",
    alt: "Nel Bannink houdt een telefoon met proost-scherm omhoog",
    eyebrow: "Bijna aan het eind",
    title: "Proost op Nel",
    body: "Als laatste rondes verschijnen Nel 1 en Nel 4 als vrolijke afsluiters."
  },
  {
    src: "/nel/nel-4.png",
    alt: "Nel Bannink heft een glas bier in de kroeg",
    eyebrow: "Laatste foto",
    title: "Schellerhart zegt proost",
    body: "De finale eindigt met een glas omhoog voor Nel en de hele kroegentocht."
  }
];

export function NelSpotlight() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 4500);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const slide = slides[index];

  return (
    <section className="overflow-hidden rounded-4xl border border-white/70 bg-white/90 shadow-card">
      <div className="relative h-64 w-full">
        <Image
          fill
          priority
          alt={slide.alt}
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 420px"
          src={slide.src}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
            {slide.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-black leading-tight">{slide.title}</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/90">{slide.body}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 bg-white px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Nel-volgorde: 2, 3, 1, 4
        </p>
        <div className="flex gap-2">
          {slides.map((item, slideIndex) => (
            <span
              key={item.src}
              className={`h-2.5 w-2.5 rounded-full ${
                slideIndex === index ? "bg-accent" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
