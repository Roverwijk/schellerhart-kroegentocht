"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { MobileShell } from "@/components/mobile-shell";
import { TeamSelect } from "@/components/team-select";
import { TimerPill } from "@/components/timer-pill";
import { createBrowserRealtimeClient } from "@/lib/supabase/browser";
import { isInputClosed } from "@/lib/time";
import type { GameState, Round, Team, TeamAssignment } from "@/lib/types";

type BootstrapResponse = {
  gameState: GameState;
  teams: Team[];
  rounds: Round[];
  currentRound: Round | null;
  assignments: TeamAssignment[];
};

type UploadScreenProps = {
  lockedTeamSlug?: string;
};

export function UploadScreen({ lockedTeamSlug }: UploadScreenProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [teamId, setTeamId] = useState("");
  const [photos, setPhotos] = useState<Record<string, File | null>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const previewUrlsRef = useRef<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  useEffect(() => {
    let active = true;

    async function load() {
      const response = await fetch("/api/bootstrap", { cache: "no-store" });
      const payload = (await response.json()) as BootstrapResponse;
      if (!active) {
        return;
      }
      setTeams(payload.teams);
      setGameState(payload.gameState);
      setCurrentRound(payload.currentRound);
      setAssignments(payload.assignments);

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
        () => {
          load().catch(() => undefined);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
      Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [lockedTeamSlug]);

  const lockedTeam = useMemo(
    () => teams.find((team) => team.id === teamId) ?? null,
    [teamId, teams]
  );

  const closed = useMemo(
    () => (gameState ? gameState.phase !== "upload" || isInputClosed(gameState) : true),
    [gameState]
  );

  const teamAssignments = useMemo(
    () =>
      assignments
        .filter((assignment) => assignment.team_id === teamId)
        .sort((left, right) => left.slot - right.slot),
    [assignments, teamId]
  );

  async function uploadAssignment(assignment: TeamAssignment) {
    const file = photos[assignment.id] ?? null;
    if (!file) {
      setError("Kies eerst een foto voor deze opdracht.");
      return;
    }

    setSubmittingId(assignment.id);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.set("teamId", teamId);
    formData.set("assignmentId", assignment.id);
    formData.set("photo", file);

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
      setSubmittingId(null);
      return;
    }

    setMessage(`Upload gelukt voor opdracht ${assignment.slot}: ${payload.canonicalProverb}`);
    if (previewUrls[assignment.id]) {
      URL.revokeObjectURL(previewUrls[assignment.id]);
    }
    setPreviewUrls((previous) => {
      const next = { ...previous };
      delete next[assignment.id];
      return next;
    });
    setPhotos((previous) => ({ ...previous, [assignment.id]: null }));
    setSubmittingId(null);

    const refresh = await fetch("/api/bootstrap", { cache: "no-store" });
    const nextPayload = (await refresh.json()) as BootstrapResponse;
    setGameState(nextPayload.gameState);
    setCurrentRound(nextPayload.currentRound);
    setAssignments(nextPayload.assignments);
  }

  return (
    <MobileShell
      title="Upload"
      phase={gameState?.phase ?? "waiting"}
      roundNumber={currentRound?.number ?? null}
      subtitle={
        currentRound
          ? `Ronde ${currentRound.number}: upload 2 foto's voor jullie vaste opdrachten.`
          : "Deze teampagina staat klaar voor de volgende ronde."
      }
      actions={
        gameState?.upload_ends_at && gameState.phase === "upload" ? (
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

        {lockedTeamSlug ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Team</span>
            <p className="text-lg font-black text-ink">{lockedTeam?.name ?? "Team laden..."}</p>
          </div>
        ) : (
          <TeamSelect
            disabled={Boolean(submittingId) || closed}
            teams={teams}
            value={teamId}
            onChange={setTeamId}
          />
        )}

        {currentRound ? (
          <div className="mt-4 rounded-3xl bg-slate-100 px-4 py-4 text-sm text-slate-700">
            <p className="font-black text-ink">{currentRound.title}</p>
            <p className="mt-1">Per ronde heeft elk team precies 2 vaste spreekwoorden.</p>
          </div>
        ) : null}

        <div className="mt-4 space-y-4">
          {teamAssignments.map((assignment) => (
            <article
              key={assignment.id}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Opdracht {assignment.slot}
                  </p>
                  <h2 className="mt-2 text-lg font-black text-ink">
                    {assignment.proverb_text}
                  </h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.15em] ${
                    assignment.is_uploaded ? "bg-teal/10 text-teal" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {assignment.is_uploaded ? "Geupload" : "Open"}
                </span>
              </div>

              {assignment.photo_url ? (
                <img
                  alt={`Laatste upload voor ${assignment.proverb_text}`}
                  className="mt-4 h-48 w-full rounded-3xl object-cover"
                  src={assignment.photo_url}
                />
              ) : null}

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Nieuwe foto</span>
                <input
                  accept="image/*"
                  capture="environment"
                  className="block w-full rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:font-semibold file:text-white"
                  disabled={Boolean(submittingId) || closed}
                  type="file"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    if (previewUrls[assignment.id]) {
                      URL.revokeObjectURL(previewUrls[assignment.id]);
                    }
                    setPhotos((previous) => ({ ...previous, [assignment.id]: nextFile }));
                    setPreviewUrls((previous) => ({
                      ...previous,
                      [assignment.id]: nextFile ? URL.createObjectURL(nextFile) : ""
                    }));
                  }}
                />
              </label>

              {previewUrls[assignment.id] ? (
                <img
                  alt="Voorvertoning"
                  className="mt-4 h-48 w-full rounded-3xl object-cover"
                  src={previewUrls[assignment.id]}
                />
              ) : null}

              <button
                className="mt-4 w-full rounded-3xl bg-accent px-4 py-4 text-base font-black text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!teamId || !photos[assignment.id] || Boolean(submittingId) || closed}
                type="button"
                onClick={() => {
                  uploadAssignment(assignment).catch(() => undefined);
                }}
              >
                {submittingId === assignment.id
                  ? "Bezig..."
                  : assignment.is_uploaded
                    ? "Vervang upload"
                    : "Upload foto"}
              </button>
            </article>
          ))}

          {teamId && teamAssignments.length === 0 ? (
            <section className="rounded-4xl border border-slate-200 bg-white/85 p-4 text-sm text-slate-700 shadow-card">
              Voor dit team staan in deze ronde nog geen opdrachten klaar.
            </section>
          ) : null}
        </div>
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
            ? "We wachten nog op de start van de volgende ronde. De admin zet de uploadfase zo live."
            : "De uploadfase is dicht. De admin kan de fase of ronde aanpassen in het adminscherm."}
        </section>
      ) : null}
    </MobileShell>
  );
}
