"use client";

import { useEffect, useState } from "react";

import { formatSeconds, secondsRemaining } from "@/lib/time";

type TimerPillProps = {
  endsAt: string | null;
  label: string;
};

export function TimerPill({ endsAt, label }: TimerPillProps) {
  const [remaining, setRemaining] = useState(() => secondsRemaining(endsAt));

  useEffect(() => {
    setRemaining(secondsRemaining(endsAt));
    const timer = window.setInterval(() => {
      setRemaining(secondsRemaining(endsAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [endsAt]);

  return (
    <div className="rounded-full bg-ink px-4 py-2 text-center text-sm font-semibold text-white">
      <span className="block text-[10px] uppercase tracking-[0.2em] text-orange-200">
        {label}
      </span>
      <span>{formatSeconds(remaining)}</span>
    </div>
  );
}
