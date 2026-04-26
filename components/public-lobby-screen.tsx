"use client";

import { useEffect, useMemo, useState } from "react";

import { MobileShell } from "@/components/mobile-shell";
import { TimerPill } from "@/components/timer-pill";
import { createBrowserRealtimeClient } from "@/lib/supabase/browser";
import type { GameState, Round } from "@/lib/types";

type BootstrapResponse = {
  gameState: GameState;
  rounds: Round[];
  currentRound: Round | null;
};

function cacheBust(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_=${Date.now()}`;
}

export function PublicLobbyScreen() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const response = await fetch(cacheBust("/api/bootstrap"), { cache: "no-store" });
      const payload = (await response.json()) as BootstrapResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Spelstatus laden mislukte.");
      }
      if (!active) {
        return;
      }

      setError(null);
      setGameState(payload.gameState);
      setCurrentRound(payload.currentRound);
    }

    load().catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Spelstatus laden mislukte.");
    });

    const supabase = createBrowserRealtimeClient();
    const channel = supabase
      .channel("public-lobby")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_state",
          filter: "id=eq.singleton"
        },
        () => {
          load().catch(() => undefined);
        }
      )
      .subscribe();

    const interval = window.setInterval(() => {
      load().catch(() => undefined);
    }, 5_000);

    return () => {
      active = false;
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const title = useMemo(() => {
    if (!gameState) {
      return "Wachten...";
    }
    if (gameState.phase === "waiting") {
      return "Wacht op de start";
    }
    if (gameState.phase === "upload" && currentRound) {
      return currentRound.title;
    }
    if (gameState.phase === "voting") {
      return "Stemfase";
    }
    return "Resultaten";
  }, [currentRound, gameState]);

  const subtitle = useMemo(() => {
    if (!gameState) {
      return "De spelstatus wordt geladen.";
    }
    if (gameState.phase === "waiting") {
      return "De spelleiding bepaalt wanneer de volgende ronde begint. Gebruik straks jullie vaste team-QR om direct in de juiste ronde te komen.";
    }
    if (gameState.phase === "upload" && currentRound) {
      return `${currentRound.title} staat open. Open jullie vaste team-QR om precies de 2 opdrachten van deze ronde te zien.`;
    }
    if (gameState.phase === "voting") {
      return "De stemfase is begonnen. Open jullie vaste team-QR om de foto's te beoordelen en antwoorden op te slaan.";
    }
    return "De uitslag is bekend. Open jullie vaste team-QR om jullie antwoorden en goed/fout-overzicht te bekijken.";
  }, [currentRound, gameState]);

  return (
    <MobileShell
      title={title}
      phase={gameState?.phase ?? "waiting"}
      roundNumber={currentRound?.number ?? null}
      subtitle={subtitle}
      actions={
        gameState?.phase === "upload" ? (
          <TimerPill endsAt={gameState.upload_ends_at} label="Upload" />
        ) : gameState?.phase === "voting" ? (
          <TimerPill endsAt={gameState.voting_ends_at} label="Voting" />
        ) : null
      }
    >
      <section className="rounded-4xl border border-white/70 bg-white/90 p-5 shadow-card">
        <div className="rounded-3xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
          <p className="font-black text-ink">Zo werkt het voor deelnemers</p>
          <p className="mt-2">
            De spelleiding zet de fase live. Jullie hoeven dus niet zelf te kiezen tussen uploaden,
            stemmen of resultaten.
          </p>
          <p className="mt-2">
            Gebruik altijd jullie vaste team-QR. Die pagina schakelt automatisch mee met de ronde
            die de admin opent.
          </p>
        </div>
      </section>

      {error ? (
        <section className="rounded-4xl border border-berry/20 bg-rose-50 p-4 text-sm font-semibold text-berry">
          {error}
        </section>
      ) : null}
    </MobileShell>
  );
}
