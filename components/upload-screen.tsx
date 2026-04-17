"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { MobileShell } from "@/components/mobile-shell";
import { ProverbAutosuggest } from "@/components/proverb-autosuggest";
import { TeamSelect } from "@/components/team-select";
import { TimerPill } from "@/components/timer-pill";
import { createBrowserRealtimeClient } from "@/lib/supabase/browser";
import { isInputClosed } from "@/lib/time";
import type { GameState, ProverbSuggestion, Team } from "@/lib/types";

type BootstrapResponse = {
  gameState: GameState;
  teams: Team[];
};

type UploadScreenProps = {
  lockedTeamSlug?: string;
};

export function UploadScreen({ lockedTeamSlug }: UploadScreenProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [teamId, setTeamId] = useState("");
  const [proverb, setProverb] = useState("");
  const [selectedProverb, setSelectedProverb] = useState<ProverbSuggestion | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const response = await fetch("/api/bootstrap");
      const payload = (await response.json()) as BootstrapResponse;
      if (!active) {
        return;
      }
      setTeams(payload.teams);
      setGameState(payload.gameState);

      if (lockedTeamSlug) {
        const lockedTeam = payload.teams.find((team) => team.slug === lockedTeamSlug);
        if (!lockedTeam) {
          setError("Onbekende teamlink. Vraag de admin om een nieuwe QR-code.");
          return;
        }
        setTeamId(lockedTeam.id);
      }
    }

    load().catch(() => setError("Spelstatus laden mislukte."));

    const supabase = createBrowserRealtimeClient();
    const channel = supabase
      .channel("upload-game-state")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_state",
          filter: "id=eq.singleton"
        },
        (payload) => {
          setGameState(payload.new as GameState);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [lockedTeamSlug]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const lockedTeam = useMemo(
    () => teams.find((team) => team.id === teamId) ?? null,
    [teamId, teams]
  );

  const closed = useMemo(
    () => (gameState ? gameState.phase !== "upload" || isInputClosed(gameState) : true),
    [gameState]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photo) {
      setError("Voeg een foto toe.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.set("teamId", teamId);
    formData.set("proverb", proverb);
    formData.set("photo", photo);
    if (selectedProverb) {
      formData.set("selectedProverbId", selectedProverb.id);
    }

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });
    const payload = (await response.json()) as {
      error?: string;
      canonicalProverb?: string;
    };

    if (!response.ok) {
      setError(payload.error ?? "Upload mislukt.");
      setSubmitting(false);
      return;
    }

    setMessage(`Upload gelukt. Opgeslagen als: ${payload.canonicalProverb}`);
    setProverb("");
    setSelectedProverb(null);
    setPhoto(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSubmitting(false);
  }

  return (
    <MobileShell
      title="Upload"
      phase={gameState?.phase ?? "waiting"}
      subtitle={
        lockedTeamSlug
          ? "Deze uploadlink hoort bij jouw team. Maak een foto en zet het juiste spreekwoord erbij."
          : "Team kiest zichzelf, maakt een foto en zet het juiste spreekwoord erbij."
      }
      actions={
        gameState?.upload_ends_at ? (
          <TimerPill endsAt={gameState.upload_ends_at} label="Upload open" />
        ) : null
      }
    >
      <section className="rounded-4xl border border-white/70 bg-white/90 p-5 shadow-card">
        <div className="mb-4 rounded-3xl bg-amber-50 px-4 py-4 text-sm text-slate-700">
          <p className="font-black text-ink">Punten bij uploaden</p>
          <p className="mt-1">
            Jullie team krijgt later 1 punt voor elke andere ploeg die deze foto goed raadt.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {lockedTeamSlug ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Team</span>
              <p className="text-lg font-black text-ink">
                {lockedTeam?.name ?? "Team laden..."}
              </p>
            </div>
          ) : (
            <TeamSelect disabled={submitting || closed} teams={teams} value={teamId} onChange={setTeamId} />
          )}

          <div className="space-y-3">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Foto</span>
              <input
                accept="image/*"
                capture="environment"
                className="block w-full rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:font-semibold file:text-white"
                disabled={submitting || closed}
                type="file"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setPhoto(nextFile);
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                  }
                  setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
                }}
              />
            </label>
            {previewUrl ? (
              <img
                alt="Voorvertoning"
                className="h-64 w-full rounded-4xl object-cover"
                src={previewUrl}
              />
            ) : null}
          </div>

          <ProverbAutosuggest
            disabled={submitting || closed}
            onCanonicalPick={setSelectedProverb}
            onChange={setProverb}
            value={proverb}
          />

          <button
            className="w-full rounded-3xl bg-accent px-4 py-4 text-base font-black text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={submitting || closed || !teamId || !photo || !proverb.trim()}
            type="submit"
          >
            {submitting ? "Bezig..." : "Verstuur upload"}
          </button>
        </form>
      </section>

      {message ? (
        <section className="rounded-4xl border border-teal/20 bg-teal/10 p-4 text-sm font-semibold text-teal">
          {message}
        </section>
      ) : null}

      {error ? (
        <section className="rounded-4xl border border-berry/20 bg-rose-50 p-4 text-sm font-semibold text-berry">
          {error}
        </section>
      ) : null}

      {closed ? (
        <section className="rounded-4xl border border-slate-200 bg-white/85 p-4 text-sm text-slate-700 shadow-card">
          {gameState?.phase === "waiting"
            ? "We wachten nog op de start. De admin zet het spel zo live."
            : "De uploadfase is dicht. De admin kan de fase of timer aanpassen in het adminscherm."}
        </section>
      ) : null}
    </MobileShell>
  );
}
