"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { MobileShell } from "@/components/mobile-shell";
import { ProverbAutosuggest } from "@/components/proverb-autosuggest";
import { TimerPill } from "@/components/timer-pill";
import { UploadScreen } from "@/components/upload-screen";
import { createBrowserRealtimeClient } from "@/lib/supabase/browser";
import type {
  GameState,
  ProverbSuggestion,
  Team,
  VotingQueueItem,
  VoteReviewItem
} from "@/lib/types";

type BootstrapResponse = {
  gameState: GameState;
  teams: Team[];
};

type VotePayload = {
  gameState: GameState;
  items: VotingQueueItem[];
  currentIndex: number;
  completed: number;
  closed: boolean;
  review: VoteReviewItem[];
};

type DraftState = {
  guess: string;
  selectedProverb: ProverbSuggestion | null;
};

function cacheBust(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_=${Date.now()}`;
}

function getNextBrowseIndex(items: VotingQueueItem[], fromIndex: number): number {
  if (items.length === 0) {
    return 0;
  }

  const nextUnanswered = items.findIndex(
    (item, index) => index > fromIndex && !item.is_answered
  );

  if (nextUnanswered >= 0) {
    return nextUnanswered;
  }

  return Math.min(fromIndex + 1, items.length - 1);
}

type TeamPlayScreenProps = {
  teamSlug: string;
};

function LockedVoteStage({ team }: { team: Team }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [items, setItems] = useState<VotingQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [closed, setClosed] = useState(true);
  const [review, setReview] = useState<VoteReviewItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    let active = true;

    async function refresh(preferredIndex?: number) {
      const response = await fetch(cacheBust(`/api/vote/next?teamId=${team.id}`), {
        cache: "no-store"
      });
      const payload = (await response.json()) as VotePayload & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Stemstatus laden mislukte.");
      }
      if (!active) {
        return;
      }
      setGameState(payload.gameState);
      setItems(payload.items);
      setCompleted(payload.completed);
      setClosed(payload.closed);
      setReview(payload.review);
      setCurrentIndex(() => {
        if (payload.items.length === 0) {
          return 0;
        }
        if (typeof preferredIndex === "number") {
          return Math.max(0, Math.min(preferredIndex, payload.items.length - 1));
        }
        return payload.currentIndex >= 0 ? payload.currentIndex : 0;
      });
    }

    refresh().catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Stemstatus laden mislukte.");
    });

    const supabase = createBrowserRealtimeClient();
    const channel = supabase
      .channel(`locked-vote-${team.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_state",
          filter: "id=eq.singleton"
        },
        () => {
          refresh(currentIndexRef.current).catch(() => undefined);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [team.id]);

  const current = items[currentIndex] ?? null;
  const total = items.length;
  const currentDraft = current ? drafts[current.submission_id] : undefined;
  const guess = currentDraft?.guess ?? current?.guessed_text ?? "";
  const selectedProverb = currentDraft?.selectedProverb ?? null;

  const canVote = useMemo(
    () => Boolean(current && !closed && gameState?.phase === "voting"),
    [current, closed, gameState]
  );

  function updateDraft(partial: Partial<DraftState>) {
    if (!current) {
      return;
    }

    setDrafts((previous) => ({
      ...previous,
      [current.submission_id]: {
        guess: previous[current.submission_id]?.guess ?? current.guessed_text ?? "",
        selectedProverb: previous[current.submission_id]?.selectedProverb ?? null,
        ...partial
      }
    }));
  }

  async function submitVote() {
    if (!current) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        teamId: team.id,
        submissionId: current.submission_id,
        guess,
        selectedProverbId: selectedProverb?.id ?? null
      })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Stem opslaan mislukte.");
      setSubmitting(false);
      return;
    }

    setDrafts((previous) => {
      const next = { ...previous };
      delete next[current.submission_id];
      return next;
    });
    setSubmitting(false);

    const refresh = await fetch(cacheBust(`/api/vote/next?teamId=${team.id}`), {
      cache: "no-store"
    });
    const nextPayload = (await refresh.json()) as VotePayload;
    setGameState(nextPayload.gameState);
    setItems(nextPayload.items);
    setCompleted(nextPayload.completed);
    setClosed(nextPayload.closed);
    setReview(nextPayload.review);
    setCurrentIndex(getNextBrowseIndex(nextPayload.items, currentIndex));
  }

  return (
    <MobileShell
      title="Stem"
      phase={gameState?.phase ?? "waiting"}
      subtitle="Deze teampagina schakelt automatisch over naar de stemfase. Sla antwoorden op en pas ze aan tot de timer sluit."
      actions={
        gameState?.voting_ends_at ? (
          <TimerPill endsAt={gameState.voting_ends_at} label="Stemtijd" />
        ) : null
      }
    >
      <section className="rounded-4xl border border-white/70 bg-white/90 p-5 shadow-card">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Team</span>
            <p className="text-lg font-black text-ink">{team.name}</p>
          </div>

          <div className="rounded-3xl bg-amber-50 px-4 py-4 text-sm text-slate-700">
            <p className="font-black text-ink">Punten bij stemmen</p>
            <p className="mt-1">
              Raad je goed, dan krijgt jouw team 1 punt en het makersteam van die foto ook 1 punt.
            </p>
            <p className="mt-1">
              Je mag antwoorden bewaren en aanpassen tot de stemtijd afloopt.
            </p>
          </div>

          {total > 0 ? (
            <>
              <p className="rounded-3xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">
                Foto {currentIndex + 1} van {total}
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map((item, index) => (
                  <button
                    key={item.submission_id}
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${
                      index === currentIndex
                        ? "border-2 border-amber-300 bg-ink text-white shadow-[0_0_0_3px_rgba(251,191,36,0.25)]"
                        : item.is_answered
                          ? "border border-teal/30 bg-teal text-white"
                          : "border-2 border-rose-300 bg-white text-berry"
                    }`}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <p className="text-sm font-semibold text-slate-500">
                {completed} van {total} foto&apos;s hebben al een opgeslagen antwoord.
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                  <span className="h-3 w-3 rounded-full border-2 border-rose-300 bg-white" />
                  Open
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                  <span className="h-3 w-3 rounded-full border border-teal/30 bg-teal" />
                  Opgeslagen
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                  <span className="h-3 w-3 rounded-full border-2 border-amber-300 bg-ink" />
                  Huidig
                </div>
              </div>
            </>
          ) : null}

          {canVote && current ? (
            <div key={current.submission_id} className="space-y-4">
              <img
                alt={`Foto van ${current.team_name}`}
                className="h-72 w-full rounded-4xl object-cover"
                src={current.photo_url}
              />
              <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-500">
                <p>Niet van jouw team. Typ wat jij denkt dat het spreekwoord is.</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.15em] ${
                    current.is_answered ? "bg-teal/10 text-teal" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {current.is_answered ? "Opgeslagen" : "Open"}
                </span>
              </div>
              <ProverbAutosuggest
                disabled={submitting}
                label="Jouw antwoord"
                onCanonicalPick={(next) => updateDraft({ selectedProverb: next })}
                onChange={(value) => updateDraft({ guess: value })}
                placeholder="Raad het spreekwoord"
                value={guess}
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="rounded-3xl bg-slate-100 px-4 py-4 text-base font-black text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300"
                  disabled={currentIndex === 0 || submitting}
                  type="button"
                  onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
                >
                  Vorige
                </button>
                <button
                  className="rounded-3xl bg-slate-100 px-4 py-4 text-base font-black text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300"
                  disabled={currentIndex >= total - 1 || submitting}
                  type="button"
                  onClick={() => setCurrentIndex((value) => Math.min(total - 1, value + 1))}
                >
                  Volgende
                </button>
              </div>
              <button
                className="w-full rounded-3xl bg-accent px-4 py-4 text-base font-black text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!guess.trim() || submitting}
                type="button"
                onClick={() => {
                  submitVote().catch(() => undefined);
                }}
              >
                {submitting ? "Bezig..." : "Opslaan en volgende"}
              </button>
            </div>
          ) : null}

          {!canVote && !closed && total === 0 ? (
            <div className="rounded-3xl bg-slate-100 px-4 py-4 text-sm font-semibold text-slate-600">
              Nog geen foto&apos;s van andere teams beschikbaar.
            </div>
          ) : null}

          {!canVote && !closed && total > 0 && !current ? (
            <div className="rounded-3xl bg-slate-100 px-4 py-4 text-sm font-semibold text-slate-600">
              Er zijn foto&apos;s beschikbaar, maar de huidige selectie kon niet worden geladen.
            </div>
          ) : null}
        </div>
      </section>

      {closed && (gameState?.phase === "results" || gameState?.phase === "voting") ? (
        <section className="space-y-3 rounded-4xl border border-white/70 bg-white/90 p-5 shadow-card">
          <div>
            <h2 className="text-lg font-black">Jouw resultaten</h2>
            <p className="mt-1 text-sm text-slate-600">
              Goed of fout per foto, plus het juiste spreekwoord.
            </p>
          </div>
          {review.length === 0 ? (
            <p className="rounded-3xl bg-slate-100 px-4 py-4 text-sm font-semibold text-slate-600">
              Nog geen antwoorden gevonden voor dit team.
            </p>
          ) : (
            review.map((item, index) => (
              <article
                key={item.vote_id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-black text-ink">Foto {index + 1}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.15em] ${
                      item.is_correct ? "bg-teal/10 text-teal" : "bg-rose-100 text-berry"
                    }`}
                  >
                    {item.is_correct ? "Goed" : "Fout"}
                  </span>
                </div>
                <img
                  alt="Beoordeelde foto"
                  className="mt-3 h-40 w-full rounded-3xl object-cover"
                  src={item.photo_url}
                />
                <p className="mt-3 text-sm text-slate-600">
                  Jij typte: <span className="font-bold text-ink">{item.guessed_text}</span>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Juiste spreekwoord:{" "}
                  <span className="font-bold text-ink">{item.correct_proverb_text}</span>
                </p>
              </article>
            ))
          )}
        </section>
      ) : null}

      {error ? (
        <section className="rounded-4xl border border-berry/20 bg-rose-50 p-4 text-sm font-semibold text-berry">
          {error}
        </section>
      ) : null}

      {gameState?.phase === "waiting" ? (
        <section className="rounded-4xl border border-slate-200 bg-white/85 p-4 text-sm text-slate-700 shadow-card">
          We wachten nog op de start. Deze teamlink springt vanzelf naar upload zodra de admin begint.
        </section>
      ) : null}
    </MobileShell>
  );
}

export function TeamPlayScreen({ teamSlug }: TeamPlayScreenProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const response = await fetch(cacheBust("/api/bootstrap"), { cache: "no-store" });
      const payload = (await response.json()) as BootstrapResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Teampagina laden mislukte.");
      }
      if (!active) {
        return;
      }

      const lockedTeam = payload.teams.find((item) => item.slug === teamSlug) ?? null;
      if (!lockedTeam) {
        setError("Onbekende teamlink. Vraag de admin om een nieuwe QR-code.");
        return;
      }

      setError(null);
      setTeam(lockedTeam);
      setGameState(payload.gameState);
    }

    load().catch(() => setError("Teampagina laden mislukte."));

    const supabase = createBrowserRealtimeClient();
    const channel = supabase
      .channel(`team-play-${teamSlug}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_state",
          filter: "id=eq.singleton"
        },
        () => {
          load().catch(() => setError("Teampagina laden mislukte."));
        }
      )
      .subscribe();

    const interval = window.setInterval(() => {
      load().catch(() => undefined);
    }, 15_000);

    return () => {
      active = false;
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [teamSlug]);

  if (error) {
    return (
      <MobileShell
        title="Team"
        phase="waiting"
        subtitle="Deze pagina is gekoppeld aan één team en wisselt automatisch met de spelstatus."
      >
        <section className="rounded-4xl border border-berry/20 bg-rose-50 p-4 text-sm font-semibold text-berry">
          {error}
        </section>
      </MobileShell>
    );
  }

  if (!gameState || !team) {
    return (
      <MobileShell
        title="Team"
        phase={gameState?.phase ?? "waiting"}
        subtitle="Deze pagina is gekoppeld aan één team en wisselt automatisch met de spelstatus."
      >
        <section className="rounded-4xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-600 shadow-card">
          Bezig met laden...
        </section>
      </MobileShell>
    );
  }

  if (gameState.phase === "waiting") {
    return (
      <MobileShell
        title="Wacht op de start"
        phase="waiting"
        subtitle="Deze teamlink staat klaar. Zodra de admin het spel opent, schakelt de pagina vanzelf door."
      >
        <section className="rounded-4xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-700 shadow-card">
          Nog even geduld. Nel houdt de sfeer er alvast in tot de kroegentocht begint.
        </section>
      </MobileShell>
    );
  }

  if (gameState.phase === "upload") {
    return <UploadScreen lockedTeamSlug={teamSlug} />;
  }

  return <LockedVoteStage team={team} />;
}
